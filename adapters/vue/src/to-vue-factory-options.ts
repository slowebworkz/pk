import type {
  AnyClassPluginFactory,
  ElementType,
  FactoryOptions,
  RecipeMap,
  VariantMap,
} from '@praxis-kit/core'
import { isFunction } from '@praxis-kit/primitive'
import { isFactoryOptionsLike } from '@praxis-kit/adapter-utils'
import type { UnknownProps } from './types/primitives'
import type { VueFactoryOptions } from './vue-options'

/** Vue-specific addition on top of `FactoryOptions`. */
const VUE_FIELD_VALIDATORS: Record<string, (value: unknown) => boolean> = {
  filterProps: (v) => v === undefined || isFunction(v),
}

/**
 * Type guard narrowing the generic `FactoryOptions` shape down to
 * `VueFactoryOptions` — the type `buildRuntime` is declared against. See
 * `isFactoryOptionsLike` for what this does and doesn't validate.
 */
export function isVueFactoryOptions<
  TDefault extends ElementType,
  Props extends UnknownProps,
  Variants extends Readonly<VariantMap>,
  TPreset extends RecipeMap<Variants>,
  TPlugin extends AnyClassPluginFactory = AnyClassPluginFactory,
>(
  options: FactoryOptions<TDefault, Props, Variants, TPreset, TPlugin>,
): options is VueFactoryOptions<TDefault, Props, Variants, TPreset, TPlugin> {
  return isFactoryOptionsLike(options, VUE_FIELD_VALIDATORS)
}
