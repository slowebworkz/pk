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
import type { LitFactoryOptions } from './types'

/** Lit-specific addition on top of `FactoryOptions`. */
const LIT_FIELD_VALIDATORS: Record<string, (value: unknown) => boolean> = {
  filterProps: (v) => v === undefined || isFunction(v),
}

/**
 * Type guard narrowing the generic `FactoryOptions` shape down to
 * `LitFactoryOptions` — the type `buildRuntime` is declared against. See
 * `isFactoryOptionsLike` for what this does and doesn't validate.
 */
export function isLitFactoryOptions<
  TDefault extends ElementType,
  Props extends AnyRecord,
  Variants extends Readonly<VariantMap>,
  TPreset extends RecipeMap<Variants>,
  TPlugin extends AnyClassPluginFactory = AnyClassPluginFactory,
>(
  options: FactoryOptions<TDefault, Props, Variants, TPreset, TPlugin>,
): options is LitFactoryOptions<TDefault, Props, Variants, TPreset, TPlugin> {
  return isFactoryOptionsLike(options, LIT_FIELD_VALIDATORS)
}
