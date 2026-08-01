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
import { finalizeComponent, invariant, resolveSubComponentOptions } from '@praxis-kit/adapter-utils'
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
  const runtimeOptions = resolveSubComponentOptions(options)
  invariant(
    isVueFactoryOptions(runtimeOptions),
    'resolveSubComponentOptions returned a non-object options value',
  )
  const bundle = buildRuntime(runtimeOptions)

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

  type G = PolymorphicGenerics<TDefault, Props & ExtractPluginProps<TPlugin>, Variants, TPreset>
  invariant(
    isPolymorphicComponent<G>(assembled),
    'Generated component failed to satisfy the PolymorphicComponent shape',
  )

  return assembled
}
