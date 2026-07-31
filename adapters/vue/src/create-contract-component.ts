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
import { finalizeComponent, resolveSubComponentOptions } from '@praxis-kit/adapter-utils'
import { applyDisplayName } from './apply-display-name'
import { buildRuntime } from './build-runtime'
import { prepareRenderState, render } from './render'
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
) {
  const runtimeOptions = resolveSubComponentOptions(options)
  const bundle = buildRuntime(
    runtimeOptions as VueFactoryOptions<TDefault, Props, Variants, TPreset>,
  )

  const Component = defineComponent({
    // normalizeOptions always supplies `name`, so displayName is always defined here —
    // the fallback only satisfies the type, which allows it to be absent in general.
    name: bundle.runtime.options.displayName ?? 'PolymorphicComponent',
    inheritAttrs: false,
    setup(_, { attrs, slots }) {
      // Wrap pure prop resolution in computed() so Vue's reactivity skips it when attrs unchanged.
      const state = computed(() =>
        prepareRenderState(bundle.runtime, attrs as KnownProps, bundle.filterProps),
      )

      return () => render({ ...bundle, state: state.value, slots })
    },
  })

  applyDisplayName(Component, options.name)
  const assembled = finalizeComponent(
    Component,
    bundle.runtime.options.defaultTag,
    options.subComponents,
  )

  return assembled as unknown as PolymorphicComponent<
    PolymorphicGenerics<TDefault, Props & ExtractPluginProps<TPlugin>, Variants, TPreset>
  > &
    TSubComponents
}
