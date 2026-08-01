import type {
  AnyClassPluginFactory,
  AnyRecord,
  ElementType,
  EmptyRecord,
  ExtractPluginProps,
  RecipeMap,
  VariantMap,
} from '@praxis-kit/core'
import type { Diagnostics } from '@praxis-kit/diagnostics'
import {
  assembleCompoundComponent,
  diffAndApplyAttributes,
  invariant,
  resolveHostState,
  resolveSubComponentOptions,
  toLooseBundle,
} from '@praxis-kit/adapter-utils'
import { buildRuntime } from './build-runtime'
import { isWebContractComponent } from './is-web-contract-component'
import { registerForSsr } from './render-to-string'
import { isWebFactoryOptions } from './to-web-factory-options'
import type { WebContractComponent, WebFactoryOptions, UnknownProps } from './types/index'

/**
 * Creates a plain `HTMLElement` subclass with praxis-kit contracts applied.
 *
 * No framework dependency. Register with `customElements.define()`:
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
 *   enforcement: { diagnostics: warnDiagnostics },
 * })
 *
 * customElements.define('praxis-button', Button)
 * ```
 *
 * The pipeline runs synchronously on `connectedCallback` and on every
 * `attributeChangedCallback` for praxis-owned attributes (variant keys,
 * `as`, `variant-key`, `praxis-class`).
 *
 * For non-reactive attributes (`aria-*`, `role`, `data-*`) call `element.update()`
 * after setting them to trigger an explicit pipeline re-run.
 */
export function createContractComponent<
  TDefault extends ElementType,
  TProps extends UnknownProps = EmptyRecord,
  TVariants extends Readonly<VariantMap> = Readonly<EmptyRecord>,
  TPreset extends RecipeMap<TVariants> = Readonly<EmptyRecord>,
  TPlugin extends AnyClassPluginFactory = AnyClassPluginFactory,
  TSubComponents extends Readonly<AnyRecord> = EmptyRecord,
>(
  options: WebFactoryOptions<TDefault, TProps, TVariants, TPreset, TPlugin> & {
    readonly subComponents?: TSubComponents
  },
): WebContractComponent<TVariants, ExtractPluginProps<TPlugin>> & TSubComponents {
  const runtimeOptions = resolveSubComponentOptions(options)
  invariant(
    isWebFactoryOptions(runtimeOptions),
    'resolveSubComponentOptions returned a non-object options value',
  )
  const bundle = buildRuntime(runtimeOptions)
  const looseBundle = toLooseBundle(bundle)

  const variantKeys = options.styling?.variants ? Object.keys(options.styling.variants) : []
  const pluginKeys: readonly string[] =
    'classPlugin' in bundle.runtime ? [...(bundle.runtime.classPlugin.ownedKeys ?? [])] : []

  // Attribute names observed by the browser's native attribute-change callback.
  // Variant keys use their raw name; praxisClass maps to the 'praxis-class' attribute
  // to avoid a circular class→pipeline→class read.
  const observedAttrNames = ['as', 'variant-key', 'praxis-class', ...variantKeys, ...pluginKeys]

  type InstanceProps = {
    as: string | undefined
    recipe: string | undefined
    praxisClass: string | undefined
  } & { [K in Extract<keyof TVariants, string>]?: string | null } & ExtractPluginProps<TPlugin>

  // In SSR (Node) environments HTMLElement is not defined. The class still needs
  // to be created so registerForSsr() can register the bundle — but the element
  // lifecycle methods (connectedCallback, attributeChangedCallback) will never
  // run server-side; only renderToString() is used.
  const BaseElement: typeof HTMLElement =
    typeof HTMLElement !== 'undefined' ? HTMLElement : (class {} as unknown as typeof HTMLElement)

  class PolymorphicWebElement extends BaseElement {
    // Set via Object.defineProperty below, right after the class is declared —
    // `declare` here just tells TS the static side genuinely has this property.
    declare static diagnostics: Diagnostics

    // Tracks keys set by the pipeline last run so stale ones are removed.
    private _pipelineAttrs = new Set<string>()

    static get observedAttributes(): string[] {
      return observedAttrNames
    }

    connectedCallback(): void {
      this._applyPraxis()
    }

    // Fires synchronously for every observed attribute change — no microtask
    // scheduling needed. The guard is implicit: this only fires for
    // observedAttributes, all of which are praxis-owned.
    attributeChangedCallback(_name: string, _old: string | null, _next: string | null): void {
      if (this.isConnected) {
        this._applyPraxis()
      }
    }

    /** Re-runs the pipeline. Call after setting non-reactive attributes (aria-*, role, data-*). */
    update(): void {
      this._applyPraxis()
    }

    private get _self(): InstanceProps {
      return this as unknown as InstanceProps
    }

    private _applyPraxis(): void {
      const self = this._self
      const {
        childrenEvaluator,
        runtime: { options },
      } = bundle

      // Skip 'class' (pipeline output) and all observedAttributes. Observed attrs
      // are either read as camelCase below (variant keys, as, praxis-class) or
      // are user-added observed attrs (e.g. 'value' in a subclass) that must not
      // leak into state.attributes — setAttribute on an observed attr would
      // re-trigger this callback and cause infinite recursion.
      const observedSet = new Set(
        (this.constructor as { observedAttributes?: readonly string[] }).observedAttributes ?? [],
      )
      const props: UnknownProps = {}
      for (const attr of Array.from(this.attributes)) {
        if (attr.name === 'class' || observedSet.has(attr.name)) continue
        // `disabled` is an HTML boolean attribute — presence means true regardless
        // of value (even disabled="false"), matching native <button disabled> semantics.
        // Read as a raw string otherwise, disabledProps would see '' and treat it as falsy.
        props[attr.name] = attr.name === 'disabled' ? true : attr.value
      }

      // Overlay the typed view of praxis-owned attributes; attribute values are
      // always strings, but consumers may set them via property too.
      props['as'] = self.as ?? this.getAttribute('as') ?? undefined
      props['recipe'] = self.recipe ?? this.getAttribute('variant-key') ?? undefined
      props['className'] = self.praxisClass ?? this.getAttribute('praxis-class') ?? undefined

      for (const key of variantKeys) {
        const val = self[key as Extract<keyof TVariants, string>] ?? this.getAttribute(key)
        if (val != null) props[key] = val
      }

      const hostState = resolveHostState(looseBundle, props)
      const children = Array.from(this.childNodes)

      if (childrenEvaluator) {
        childrenEvaluator.evaluate(children, {
          tag: hostState.tag,
          props: hostState.normalizedProps,
        })
      }
      options
        .htmlChildrenEvaluatorFn?.(hostState.tag)
        ?.evaluate(children, { tag: hostState.tag, props: hostState.normalizedProps })

      diffAndApplyAttributes(this, hostState, this._pipelineAttrs, props)
    }
  }

  if (options.name) {
    Object.defineProperty(PolymorphicWebElement, 'name', { value: options.name })
  }

  Object.defineProperty(PolymorphicWebElement, 'diagnostics', { value: bundle.diagnostics })

  // Validates the class shape (default generics — registerForSsr's own
  // parameter type doesn't need TVariants/TPlugin either) before registering
  // it, replacing what was previously an unchecked cast. Captured into a
  // plain const first — narrowing a `class` declaration's own identifier
  // doesn't reliably persist to later statements the same way it does for
  // an ordinary variable.
  const contractClass = PolymorphicWebElement
  invariant(
    isWebContractComponent(contractClass),
    'Generated class failed to satisfy the WebContractComponent shape',
  )

  // Register for SSR before returning — renderToString looks up the bundle via WeakMap.
  registerForSsr(contractClass, looseBundle)

  const assembled = assembleCompoundComponent(contractClass, options.subComponents)

  // TVariants/TPlugin are erased at runtime and can't be checked by any
  // guard — the check above already proves the class shape genuinely, this
  // just bridges the erased generics onto the specific public type.
  return assembled as unknown as WebContractComponent<TVariants, ExtractPluginProps<TPlugin>> &
    TSubComponents
}
