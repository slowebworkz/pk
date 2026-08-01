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
import { assembleCompoundComponent } from '@praxis-kit/adapter-utils'
import { buildRuntime } from './build-runtime'
import type { SvelteFactoryOptions } from './svelte-options'
import type { BuiltRuntime, WithChildRules } from './types/built-runtime'
import type { UnknownProps } from './types'

// Unlike the React/Solid/Preact adapters, createContractComponent in Svelte
// returns a BuiltRuntime bundle rather than a component function. Svelte
// components must come from .svelte files (compile-time constraint); the bundle
// is passed as the `bundle` prop to <Polymorphic> from Polymorphic.svelte.
// subComponents attach onto that bundle the same way — Object.assign works
// identically on a plain bundle object as on a component function/class, so
// `Card.Header` is itself just another bundle passed to `<Polymorphic bundle={Card.Header}>`.
export function createContractComponent<
  TDefault extends ElementType,
  Props extends UnknownProps = EmptyRecord,
  Variants extends Readonly<VariantMap> = Readonly<EmptyRecord>,
  TPreset extends RecipeMap<Variants> = Readonly<EmptyRecord>,
  TPlugin extends AnyClassPluginFactory = AnyClassPluginFactory,
  TSubComponents extends Readonly<AnyRecord> = EmptyRecord,
  TOptions extends WithChildRules = SvelteFactoryOptions<
    TDefault,
    Props & ExtractPluginProps<TPlugin>,
    Variants,
    TPreset
  >,
>(
  options: SvelteFactoryOptions<TDefault, Props, Variants, TPreset, TPlugin> &
    TOptions & { readonly subComponents?: TSubComponents },
): BuiltRuntime<
  PolymorphicGenerics<TDefault, Props & ExtractPluginProps<TPlugin>, Variants, TPreset>,
  TOptions
> &
  TSubComponents {
  const bundle = buildRuntime(
    options as SvelteFactoryOptions<TDefault, Props, Variants, TPreset> & TOptions,
  ) as unknown as BuiltRuntime<
    PolymorphicGenerics<TDefault, Props & ExtractPluginProps<TPlugin>, Variants, TPreset>,
    TOptions
  >

  return assembleCompoundComponent(bundle, options.subComponents)
}
