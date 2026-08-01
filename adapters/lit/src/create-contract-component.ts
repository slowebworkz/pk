import {
  assembleCompoundComponent,
  diffAndApplyAttributes,
  invariant,
  resolveHostState,
  resolveSubComponentOptions,
  resolveTagAndNormalizedProps,
  toLooseBundle,
} from '@praxis-kit/adapter-utils'
import type {
  AnyClassPluginFactory,
  ElementType,
  EmptyRecord,
  ExtractPluginProps,
  RecipeMap,
  VariantMap,
} from '@praxis-kit/core'
import { iterate } from '@praxis-kit/primitive'
import type { AnyRecord } from '@praxis-kit/core'
import { LitElement, html } from 'lit'
import { buildRuntime } from './build-runtime'
import { isLitContractComponent } from './is-lit-contract-component'
import { registerForSsr } from './render-to-string'
import { isLitFactoryOptions } from './to-lit-factory-options'
import type { LitContractComponent, LitFactoryOptions, UnknownProps } from './types'

/**
 * Creates a Lit custom element class with praxis-kit contracts applied.
 *
 * Returns a LitElement subclass. Register it with customElements.define():
 *
 * ```ts
 * const Button = createContractComponent({
 *   tag: 'button',
 *   name: 'Button',
 *   styling: {
 *     base: 'btn',
 *     variants: { intent: { primary: 'btn--primary', ghost: 'btn--ghost' } },
 *     defaults: { intent: 'primary' },
 *   },
 *   enforcement: { strict: 'warn' },
 * })
 *
 * customElements.define('praxis-button', Button)
 * ```
 */
export function createContractComponent<
  TDefault extends ElementType,
  TProps extends UnknownProps = EmptyRecord,
  TVariants extends Readonly<VariantMap> = Readonly<EmptyRecord>,
  TPreset extends RecipeMap<TVariants> = Readonly<EmptyRecord>,
  TPlugin extends AnyClassPluginFactory = AnyClassPluginFactory,
  TSubComponents extends Readonly<AnyRecord> = EmptyRecord,
>(
  options: LitFactoryOptions<TDefault, TProps, TVariants, TPreset, TPlugin> & {
    readonly subComponents?: TSubComponents
  },
): LitContractComponent<TVariants, ExtractPluginProps<TPlugin>> & TSubComponents {
  const runtimeOptions = resolveSubComponentOptions(options)
  invariant(
    isLitFactoryOptions(runtimeOptions),
    'resolveSubComponentOptions returned a non-object options value',
  )
  const bundle = buildRuntime(runtimeOptions)
  const looseBundle = toLooseBundle(bundle)

  const variantKeys = options.styling?.variants ? Object.keys(options.styling.variants) : []
  const pluginKeys: readonly string[] =
    'classPlugin' in bundle.runtime ? [...(bundle.runtime.classPlugin.ownedKeys ?? [])] : []

  // Set of reactive property keys owned by the praxis pipeline. Used in
  // requestUpdate() to decide whether a given property change requires a
  // pipeline re-run. Manual requestUpdate() calls (name === undefined) always
  // set the dirty flag so ARIA/role reconciliation is never skipped.
  const praxisProps = new Set<PropertyKey>([
    'as',
    'recipe',
    'praxisClass',
    ...variantKeys,
    ...pluginKeys,
  ])

  const staticProps: Record<string, { type: typeof String; attribute: string | boolean }> = {
    as: { type: String, attribute: 'as' },
    recipe: { type: String, attribute: 'variant-key' },
    // External className input — separate from the pipeline-output `class`
    // attribute so _applyPraxis can read it without a circular class→pipeline→class loop.
    praxisClass: { type: String, attribute: 'praxis-class' },
  }
  iterate.forEach(variantKeys, (key) => {
    staticProps[key] = { type: String, attribute: key }
  })
  iterate.forEach(pluginKeys, (key) => {
    staticProps[key] = { type: String, attribute: key }
  })

  // Typed view of the reactive instance properties that _applyPraxis reads.
  // `declare` emits no JS — Lit's finalize() installs the actual getters/setters
  // at runtime. The variant key index covers dynamic variant properties.
  type InstanceProps = {
    as: string | undefined
    recipe: string | undefined
    praxisClass: string | undefined
  } & { [K in Extract<keyof TVariants, string>]?: string | null } & ExtractPluginProps<TPlugin>

  class PolymorphicLitElement extends LitElement {
    declare as: string | undefined
    declare recipe: string | undefined
    declare praxisClass: string | undefined

    // Tracks keys set by the pipeline last render so stale attrs are removed.
    private _pipelineAttrs = new Set<string>()
    // Starts true so the first update always runs the pipeline regardless of
    // what triggered it. Cleared after _applyPraxis() and re-set only when a
    // praxis-owned property changes or requestUpdate() is called manually.
    private _praxisDirty = true

    static override get properties() {
      return staticProps
    }

    // Light DOM — class pipeline applies directly to the host element.
    protected override createRenderRoot() {
      return this
    }

    // Guard: only re-run the pipeline when a praxis-owned property changed or
    // when requestUpdate() was called manually (name === undefined — covers
    // both the initial connection and consumer-driven ARIA attribute updates).
    // Updates triggered by non-praxis reactive properties on a subclass are
    // skipped, avoiding redundant pipeline runs on unrelated state changes.
    override requestUpdate(name?: PropertyKey, oldValue?: unknown): void {
      if (name === undefined || praxisProps.has(name)) {
        this._praxisDirty = true
      }
      super.requestUpdate(name, oldValue)
    }

    override updated(changed: Map<PropertyKey, unknown>) {
      super.updated(changed)
      if (this._praxisDirty) {
        this._praxisDirty = false
        this._applyPraxis()
      }
    }

    // Single cast at the class boundary — Lit's finalize() installs the
    // reactive property getters/setters at runtime; this accessor exposes them
    // under the typed shape so _applyPraxis never needs to cast inline.
    private get _self(): InstanceProps {
      return this as unknown as InstanceProps
    }

    // Start with all current DOM attributes so the ARIA engine sees role,
    // aria-*, and any other pass-through attributes. Shared by render() and
    // _applyPraxis(), which run at different points in the same update cycle
    // and can't share a local variable.
    private _buildProps(): UnknownProps {
      const self = this._self
      const props: UnknownProps = {}
      iterate.forEach(iterate.items(this.attributes), (attr) => {
        if (attr.name === 'class') return
        // `disabled` is an HTML boolean attribute — presence means true regardless
        // of value (even disabled="false"), matching native <button disabled> semantics.
        // Read as a raw string otherwise, disabledProps would see '' and treat it as falsy.
        props[attr.name] = attr.name === 'disabled' ? true : attr.value
      })

      // Overlay Lit-managed properties for variant keys — these may differ
      // from raw attribute strings if Lit has type-coerced them.
      props['as'] = self.as
      props['recipe'] = self.recipe
      props['className'] = self.praxisClass
      iterate.forEach(variantKeys, (key) => {
        // Lit sets removed attributes to null; treat null the same as undefined
        // so CVA falls back to defaultVariants when no explicit value is present.
        const val = self[key as Extract<keyof TVariants, string>]
        if (val != null) props[key] = val
      })
      return props
    }

    private _applyPraxis() {
      const props = this._buildProps()
      diffAndApplyAttributes(this, resolveHostState(looseBundle, props), this._pipelineAttrs, props)
    }

    override render() {
      const children = Array.from(this.childNodes)
      const { tag, normalizedProps } = resolveTagAndNormalizedProps(looseBundle, this._buildProps())
      if (bundle.childrenEvaluator) {
        bundle.childrenEvaluator.evaluate(children, { tag, props: normalizedProps })
      }
      bundle.runtime.options
        .htmlChildrenEvaluatorFn?.(tag)
        ?.evaluate(children, { tag, props: normalizedProps })
      return html`<slot></slot>`
    }
  }

  if (options.name) {
    Object.defineProperty(PolymorphicLitElement, 'name', { value: options.name })
  }

  // Validates the class shape (default generics — registerForSsr's own
  // parameter type doesn't need TVariants/TPlugin either) before registering
  // it, replacing what was previously an unchecked cast.
  invariant(
    isLitContractComponent(PolymorphicLitElement),
    'Generated class failed to satisfy the LitContractComponent shape',
  )

  // Register for SSR before returning — renderToString looks up the bundle via WeakMap.
  registerForSsr(PolymorphicLitElement, looseBundle)

  const assembled = assembleCompoundComponent(PolymorphicLitElement, options.subComponents)

  // TVariants/TPlugin are erased at runtime and can't be checked by any
  // guard — the check above already proves the class shape genuinely, this
  // just bridges the erased generics onto the specific public type.
  return assembled as unknown as LitContractComponent<TVariants, ExtractPluginProps<TPlugin>> &
    TSubComponents
}
