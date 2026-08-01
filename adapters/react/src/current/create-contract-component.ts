import type {
  AnyClassPluginFactory,
  AnyRecord,
  ElementType,
  EmptyRecord,
  ExtractPluginProps,
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

export function createContractComponent<
  TDefault extends ElementType,
  Props extends UnknownProps = EmptyRecord,
  Variants extends Readonly<VariantMap> = Readonly<EmptyRecord>,
  TPreset extends RecipeMap<Variants> = Readonly<EmptyRecord>,
  TPlugin extends AnyClassPluginFactory = AnyClassPluginFactory,
  TAllowed extends ElementType = ElementType,
  TSubComponents extends Readonly<AnyRecord> = EmptyRecord,
>(
  options: ReactFactoryOptions<TDefault, Props, Variants, TPreset, TPlugin, TAllowed> & {
    readonly subComponents?: TSubComponents
  },
): PolymorphicComponent<
  PolymorphicGenerics<TDefault, Props & ExtractPluginProps<TPlugin>, Variants, TPreset, TAllowed>
> &
  TSubComponents {
  invariant(isReactFactoryOptions(options), 'options is not a valid ReactFactoryOptions object')
  const bundle = buildRuntime(options)
  const { onElement } = options

  function Component({ ref, ...props }: UnknownProps & { ref?: Ref<unknown> }) {
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
        cleanupRef.current =
          onElement(el, () => propsRef.current as unknown as Readonly<Props>) ?? undefined
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
    Props & ExtractPluginProps<TPlugin>,
    Variants,
    TPreset,
    TAllowed
  >
  invariant(
    isPolymorphicComponent<G>(assembled),
    'Generated component failed to satisfy the PolymorphicComponent shape',
  )

  return assembled
}
