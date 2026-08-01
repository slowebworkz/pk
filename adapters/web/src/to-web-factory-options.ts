import type {
  AnyClassPluginFactory,
  AnyRecord,
  ElementType,
  FactoryOptions,
  RecipeMap,
  VariantMap,
} from '@praxis-kit/core'
import { isFunction } from '@praxis-kit/primitive'
import { isFactoryOptionsLike } from '@praxis-kit/adapter-utils'
import type { WebFactoryOptions } from './types/index'

/** Web-specific addition on top of `FactoryOptions`. */
const WEB_FIELD_VALIDATORS: Record<string, (value: unknown) => boolean> = {
  filterProps: (v) => v === undefined || isFunction(v),
}

/**
 * Type guard narrowing the generic `FactoryOptions` shape that
 * `resolveSubComponentOptions` returns down to `WebFactoryOptions` — the
 * type `buildRuntime` is declared against. See `isFactoryOptionsLike` for
 * what this does and doesn't validate.
 */
export function isWebFactoryOptions<
  TDefault extends ElementType,
  Props extends AnyRecord,
  Variants extends Readonly<VariantMap>,
  TPreset extends RecipeMap<Variants>,
  TPlugin extends AnyClassPluginFactory = AnyClassPluginFactory,
>(
  options: FactoryOptions<TDefault, Props, Variants, TPreset, TPlugin>,
): options is WebFactoryOptions<TDefault, Props, Variants, TPreset, TPlugin> {
  return isFactoryOptionsLike(options, WEB_FIELD_VALIDATORS)
}
