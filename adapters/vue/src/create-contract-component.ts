import { computed, defineComponent } from 'vue'
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
import { applyDisplayName } from './apply-display-name'
import { buildRuntime } from './build-runtime'
import { isPolymorphicComponent } from './is-polymorphic-component'
import { prepareRenderState, render } from './render'
import { isVueFactoryOptions } from './to-vue-factory-options'
import type { KnownProps, PolymorphicComponent, UnknownProps } from './types'
import type { VueFactoryOptions } from './vue-options'

export function createContractComponent<
  TDefault extends ElementType,
  Props extends UnknownProps = EmptyRecord,
  Variants extends Readonly<VariantMap> = Readonly<EmptyRecord>,
  TPreset extends RecipeMap<Variants> = Readonly<EmptyRecord>,
  TPlugin extends AnyClassPluginFactory = AnyClassPluginFactory,
  TSubComponents extends Readonly<AnyRecord> = EmptyRecord,
>(
  options: VueFactoryOptions<TDefault, Props, Variants, TPreset, TPlugin> & {
    readonly subComponents?: TSubComponents
  },
): PolymorphicComponent<
  PolymorphicGenerics<TDefault, Props & ExtractPluginProps<TPlugin>, Variants, TPreset>
> &
  TSubComponents {
  invariant(isVueFactoryOptions(options), 'options is not a valid VueFactoryOptions object')
  const bundle = buildRuntime(options)
  const { onElement } = options

  const Component = defineComponent({
    // normalizeOptions always supplies `name`, so displayName is always defined here —
    // the fallback only satisfies the type, which allows it to be absent in general.
    name: bundle.runtime.options.displayName ?? 'PolymorphicComponent',
    inheritAttrs: false,
    setup(_, { attrs, slots }) {
      // Cache derived render state using Vue's dependency tracking so prop resolution only
      // recomputes when attrs change.
      const state = computed(() =>
        prepareRenderState(bundle.runtime, attrs as KnownProps, bundle.filterProps),
      )

      // setup() runs once per component instance, so this callback remains stable across
      // every render.
      //
      // Vue invokes function refs with the element on mount and `null` on unmount, matching
      // the callback-ref contract used by the React and Preact adapters. `attrs` is reactive,
      // so getProps() always observes current values. Vue re-invokes a vnode's function-ref on
      // every patch of that vnode, not just genuine mount/unmount — track the currently-bound
      // element so a same-element re-invocation (e.g. from an unrelated prop change) is a no-op
      // rather than tearing down and re-registering.
      let cleanup: (() => void) | undefined
      let boundElement: Element | null = null
      const onElementRef = onElement
        ? (element: Element | null) => {
            if (element === boundElement) return
            if (boundElement) {
              cleanup?.()
              cleanup = undefined
            }
            boundElement = element
            if (element) {
              cleanup = onElement(element, () => attrs as unknown as Readonly<Props>) ?? undefined
            }
          }
        : undefined

      return () => render({ ...bundle, state: state.value, slots, elementRef: onElementRef })
    },
  })

  applyDisplayName(Component, options.name)
  const assembled = finalizeComponent(
    Component,
    bundle.runtime.options.defaultTag,
    options.subComponents,
  )

  type G = PolymorphicGenerics<TDefault, Props & ExtractPluginProps<TPlugin>, Variants, TPreset>
  invariant(
    isPolymorphicComponent<G>(assembled),
    'Generated component failed to satisfy the PolymorphicComponent shape',
  )

  return assembled
}
