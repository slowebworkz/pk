import type {
  AnyClassPluginFactory,
  ElementType,
  FactoryOptions,
  RecipeMap,
  VariantMap,
} from '@praxis-kit/core'
import { isFunction, isObject } from '@praxis-kit/primitive'
import type { StringMap } from '@praxis-kit/primitive'
import { isFactoryOptionsLike } from '@praxis-kit/adapter-utils'
import type { ReactFactoryOptions } from './react-options'
import type { UnknownProps } from './types'

/** React-specific additions on top of `FactoryOptions`. */
const REACT_FIELD_VALIDATORS: StringMap<(value: unknown) => boolean> = {
  slotComponent: (v) => v === undefined || isFunction(v) || isObject(v),
  filterProps: (v) => v === undefined || isFunction(v),
  artifact: (v) => v === undefined || isObject(v),
}

/**
 * Type guard narrowing the generic `FactoryOptions` shape down to
 * `ReactFactoryOptions` — the type `buildRuntime` is declared against. See
 * `isFactoryOptionsLike` for what this does and doesn't validate.
 */
export function isReactFactoryOptions<
  TDefault extends ElementType,
  Props extends UnknownProps,
  Variants extends Readonly<VariantMap>,
  TPreset extends RecipeMap<Variants>,
  TPlugin extends AnyClassPluginFactory = AnyClassPluginFactory,
  TAllowed extends ElementType = ElementType,
>(
  options: FactoryOptions<TDefault, Props, Variants, TPreset, TPlugin, TAllowed>,
): options is ReactFactoryOptions<TDefault, Props, Variants, TPreset, TPlugin, TAllowed> {
  return isFactoryOptionsLike(options, REACT_FIELD_VALIDATORS)
}
