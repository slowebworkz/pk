import type {
  AnyClassPluginFactory,
  ElementType,
  FactoryOptions,
  RecipeMap,
  VariantMap,
} from '@praxis-kit/core'
import { isFunction, isObject } from '@praxis-kit/primitive'
import { isFactoryOptionsLike } from '@praxis-kit/adapter-utils'
import type { PreactFactoryOptions } from './preact-options'
import type { UnknownProps } from './types/primitives'

/** Preact-specific additions on top of `FactoryOptions`. */
const PREACT_FIELD_VALIDATORS: Record<string, (value: unknown) => boolean> = {
  slotComponent: (v) => v === undefined || isFunction(v) || isObject(v),
  filterProps: (v) => v === undefined || isFunction(v),
}

/**
 * Type guard narrowing the generic `FactoryOptions` shape that
 * `resolveSubComponentOptions` returns down to `PreactFactoryOptions` — the
 * type `buildRuntime` is declared against. See `isFactoryOptionsLike` for
 * what this does and doesn't validate.
 */
export function isPreactFactoryOptions<
  TDefault extends ElementType,
  Props extends UnknownProps,
  Variants extends Readonly<VariantMap>,
  TPreset extends RecipeMap<Variants>,
  TPlugin extends AnyClassPluginFactory = AnyClassPluginFactory,
>(
  options: FactoryOptions<TDefault, Props, Variants, TPreset, TPlugin>,
): options is PreactFactoryOptions<TDefault, Props, Variants, TPreset, TPlugin> {
  return isFactoryOptionsLike(options, PREACT_FIELD_VALIDATORS)
}
