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
import { finalizeComponent } from '@praxis-kit/adapter-utils'
import type { ReactElement, Ref } from 'react'
import { forwardRef, useCallback, useRef } from 'react'
import type { PolymorphicComponent, ReactFactoryOptions, UnknownProps } from '../shared'
import { applyDisplayName, mergeRefs, render } from '../shared'
import { buildRuntime } from './build-runtime'

/**
 * Creates a polymorphic React component with praxis-kit contracts applied, for React 18 and
 * earlier (use `praxis-kit/react` instead on React 19, which accepts `ref` as a plain prop).
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
 * Returns a `forwardRef` component — `ref` is forwarded to the rendered host element the same
 * way it works in `praxis-kit/react`. Pass `subComponents` to attach named sub-components
 * (`Card.Header`) and `onElement` to run setup once the real DOM element exists.
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
  const bundle = buildRuntime(options)
  const { onElement } = options

  // React 18: ref is not available as a plain prop — forwardRef is required.
  const Component = forwardRef<unknown, UnknownProps>(function Component(
    props: UnknownProps,
    ref: Ref<unknown> | null,
  ): ReactElement {
    // Keep current on every render so the stable callback ref can always read the latest
    // props via getProps() without re-registering.
    const propsRef = useRef(props)
    propsRef.current = props
    const cleanupRef = useRef<(() => void) | undefined>(undefined)

    // `onElement` originates from the options object closed over by createContractComponent,
    // not from props, so it's static for the component's lifetime — this callback intentionally
    // stays stable across renders. React only re-invokes a stable callback ref when the
    // underlying element instance changes (mount, replacement, or unmount), so onElement is
    // registered once for each mounted element, regardless of how many times Component re-renders.
    const onElementRef = useCallback((el: Element | null) => {
      if (!onElement) return
      if (el) {
        // Defensive: React currently always calls this ref with `null` before a replacement
        // element, but that ordering isn't part of the formal callback-ref contract — clean up
        // any existing registration first so a hypothetical el→el invocation can't leak one.
        cleanupRef.current?.()
        // The real element's actual tag is only known at runtime (`tag` default or a consumer's
        // `as` override); `onElement`'s parameter type narrows that per-component via `TDefault`/
        // `TAllowed`, which the DOM ref API itself can't express — see `FactoryOptions.onElement`.
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
    return render({ ...bundle, props, ref: mergedRef })
  })

  applyDisplayName(Component, options.name)
  const assembled = finalizeComponent(
    Component,
    bundle.runtime.options.defaultTag,
    options.subComponents,
  )

  return assembled as unknown as MergeRecords<
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
  >
}
