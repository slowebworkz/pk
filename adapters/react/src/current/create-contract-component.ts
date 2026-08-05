import type {
  AnyClassPluginFactory,
  AnyRecord,
  ElementForTag,
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
import { useCallback, useRef } from 'react'
import type { Ref } from 'react'
import type { PolymorphicComponent, ReactFactoryOptions, UnknownProps } from '../shared'
import {
  applyDisplayName,
  isPolymorphicComponent,
  isReactFactoryOptions,
  mergeRefs,
  render,
} from '../shared'
import { buildRuntime } from './build-runtime'

/**
 * Creates a polymorphic React 19 component with praxis-kit contracts applied.
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
 * `ref` is accepted as a plain prop (React 19) and forwarded to the rendered host element or,
 * with `asChild`, to the consumer's own element. Pass `subComponents` to attach named
 * sub-components (`Card.Header`) and `onElement` to run setup once the real DOM element exists.
 */
export function createContractComponent<
  TDefault extends ElementType,
  Props extends UnknownProps = EmptyRecord,
  Variants extends Readonly<VariantMap> = NoVariants,
  TPreset extends RecipeMap<Variants> = NoPreset,
  TPlugin extends AnyClassPluginFactory = AnyClassPluginFactory,
  TAllowed extends ElementType = ElementType,
  TSubComponents extends Readonly<AnyRecord> = EmptyRecord,
>(
  options: ReactFactoryOptions<TDefault, Props, Variants, TPreset, TPlugin, TAllowed> & {
    readonly subComponents?: TSubComponents
  },
): MergeRecords<
  PolymorphicComponent<
    PolymorphicGenerics<
      TDefault,
      MergeRecords<Props, ExtractPluginProps<TPlugin>>,
      Variants,
      TPreset,
      TAllowed
    >
  >,
  TSubComponents
> {
  invariant(isReactFactoryOptions(options), 'options is not a valid ReactFactoryOptions object')
  const bundle = buildRuntime(options)
  /** Captured once from the factory options so the callback ref below can remain stable. */
  const { onElement } = options

  function Component({ ref, ...props }: UnknownProps & { ref?: Ref<unknown> }) {
    /**
     * Keep current on every render so the stable callback ref can always read the latest
     * props via getProps() without re-registering.
     */
    const propsRef = useRef(props)
    propsRef.current = props
    const cleanupRef = useRef<(() => void) | undefined>(undefined)

    /**
     * `onElement` originates from the options object closed over by createContractComponent,
     * not from props, so it's static for the component's lifetime — this callback intentionally
     * stays stable across renders. React only re-invokes a stable callback ref when the
     * underlying element instance changes (mount, replacement, or unmount), so onElement is
     * registered once for each mounted element, regardless of how many times Component re-renders.
     */
    const onElementRef = useCallback((el: Element | null) => {
      if (!onElement) return
      if (el) {
        /**
         * Defensive: React currently always calls this ref with `null` before a replacement
         * element, but that ordering isn't part of the formal callback-ref contract — clean up
         * any existing registration first so a hypothetical el→el invocation can't leak one.
         * Cleared right after invoking, not left to be overwritten below, so a subsequent
         * `onElement(...)` throw doesn't leave a stale, already-invoked cleanup in place to be
         * run a second time on unmount.
         */
        cleanupRef.current?.()
        cleanupRef.current = undefined
        /**
         * The real element's actual tag is only known at runtime (`tag` default or a consumer's
         * `as` override); `onElement`'s parameter type narrows that per-component via `TDefault`/
         * `TAllowed`, which the DOM ref API itself can't express — see `FactoryOptions.onElement`.
         */
        cleanupRef.current =
          onElement(
            el as ElementForTag<TDefault | TAllowed>,
            () => propsRef.current as unknown as Readonly<Props>,
          ) ?? undefined
      } else {
        cleanupRef.current?.()
        cleanupRef.current = undefined
      }
    }, [])

    const mergedRef = onElement ? mergeRefs(ref, onElementRef) : ref
    return render({ ...bundle, props, ref: mergedRef ?? null })
  }

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
    TPreset,
    TAllowed
  >
  invariant(
    isPolymorphicComponent<G>(assembled),
    'Generated component failed to satisfy the PolymorphicComponent shape',
  )

  /**
   * MergeRecords is a conditional type. While these generics are still open, TypeScript cannot
   * prove that the assembled value satisfies the same conditional expression used by the
   * declared return type. Once the generics are instantiated at a call site, the conditional
   * simplifies correctly. The invariant above validates the runtime shape; this assertion
   * bridges the gap in the compiler's type reasoning.
   */
  return assembled as MergeRecords<PolymorphicComponent<G>, TSubComponents>
}
