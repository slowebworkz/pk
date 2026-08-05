import type {
  AnyClassPluginFactory,
  AnyRecord,
  ElementType,
  EmptyRecord,
  ExtractPluginProps,
  MergeRecords,
  NoPreset,
  NoVariants,
  PolymorphicGenerics,
  RecipeMap,
  VariantMap,
} from '@praxis-kit/core'
import { finalizeComponent, invariant } from '@praxis-kit/adapter-utils'
import { forwardRef } from 'preact/compat'
import type { ForwardedRef } from 'preact/compat'
import { useCallback, useRef } from 'preact/hooks'
import { applyDisplayName } from './apply-display-name'
import { render } from './render'
import { buildRuntime } from './build-runtime'
import { isPolymorphicComponent } from './is-polymorphic-component'
import { mergeRefs } from './slot/composeRefs'
import { isPreactFactoryOptions } from './to-preact-factory-options'
import type { AnyVNode, PolymorphicComponent, UnknownProps } from './types'
import type { PreactFactoryOptions } from './preact-options'

/**
 * Creates a polymorphic Preact component with praxis-kit contracts applied.
 *
 * ```tsx
 * const Button = createContractComponent({
 *   tag: 'button',
 *   name: 'Button',
 *   styling: {
 *     base: 'btn',
 *     variants: { intent: { primary: 'btn--primary', ghost: 'btn--ghost' } },
 *     defaults: { intent: 'primary' },
 *   },
 * })
 *
 * <Button intent="ghost" as="a" href="/home">Home</Button>
 * ```
 *
 * Returns a `forwardRef` component — `ref` is forwarded to the rendered host element. Pass
 * `subComponents` to attach named sub-components (`Card.Header`) and `onElement` to run setup
 * once the real DOM element exists.
 */
export function createContractComponent<
  TDefault extends ElementType,
  Props extends UnknownProps = EmptyRecord,
  Variants extends Readonly<VariantMap> = NoVariants,
  TPreset extends RecipeMap<Variants> = NoPreset,
  TPlugin extends AnyClassPluginFactory = AnyClassPluginFactory,
  TSubComponents extends Readonly<AnyRecord> = EmptyRecord,
>(
  options: PreactFactoryOptions<TDefault, Props, Variants, TPreset, TPlugin> & {
    readonly subComponents?: TSubComponents
  },
): MergeRecords<
  PolymorphicComponent<
    PolymorphicGenerics<
      TDefault,
      MergeRecords<Props, ExtractPluginProps<TPlugin>>,
      Variants,
      TPreset
    >
  >,
  TSubComponents
> {
  invariant(isPreactFactoryOptions(options), 'options is not a valid PreactFactoryOptions object')
  const bundle = buildRuntime(options)
  const { onElement } = options

  const Component = forwardRef(function Component(
    props: UnknownProps,
    ref: ForwardedRef<unknown>,
  ): AnyVNode {
    // Keep current on every render so the stable callback ref can always read the latest
    // props via getProps() without re-registering.
    const propsRef = useRef(props)
    propsRef.current = props
    const cleanupRef = useRef<(() => void) | undefined>(undefined)

    // `onElement` originates from the options object closed over by createContractComponent,
    // not from props, so it's static for the component's lifetime — this callback intentionally
    // stays stable across renders. Preact only re-invokes a stable callback ref when the
    // underlying element instance changes (mount, replacement, or unmount), so onElement is
    // registered once for each mounted element, regardless of how many times Component re-renders.
    const onElementRef = useCallback((el: unknown) => {
      if (!onElement) return
      if (el) {
        // Defensive: Preact currently always calls this ref with `null` before a replacement
        // element, but that ordering isn't part of the formal callback-ref contract — clean up
        // any existing registration first so a hypothetical el→el invocation can't leak one.
        cleanupRef.current?.()
        // The real element's actual tag is only known at runtime; `onElement`'s parameter type
        // narrows that per-component via `TDefault`/`allowed`, which the DOM ref API itself
        // can't express — see `FactoryOptions.onElement`.
        cleanupRef.current =
          onElement(
            el as Parameters<NonNullable<typeof onElement>>[0],
            () => propsRef.current as unknown as Readonly<Props>,
          ) ?? undefined
      } else {
        cleanupRef.current?.()
        cleanupRef.current = undefined
      }
    }, [])

    const mergedRef = onElement ? mergeRefs(ref, onElementRef) : ref
    return render({ ...bundle, props, ref: mergedRef })
  })

  applyDisplayName(Component, options.name)
  const assembled = finalizeComponent(
    Component,
    bundle.runtime.options.defaultTag,
    options.subComponents,
  )

  type G = PolymorphicGenerics<
    TDefault,
    MergeRecords<Props, ExtractPluginProps<TPlugin>>,
    Variants,
    TPreset
  >
  invariant(
    isPolymorphicComponent<G>(assembled),
    'Generated component failed to satisfy the PolymorphicComponent shape',
  )

  // MergeRecords is a conditional type. While these generics are still open, TypeScript cannot
  // prove that the assembled value satisfies the same conditional expression used by the
  // declared return type. Once the generics are instantiated at a call site, the conditional
  // simplifies correctly. The invariant above validates the runtime shape; this assertion
  // bridges the gap in the compiler's type reasoning.
  return assembled as MergeRecords<PolymorphicComponent<G>, TSubComponents>
}
