import type {
  AnyClassPluginFactory,
  ElementType as CoreElementType,
  FactoryOptions,
  NoPreset,
  RecipeMap,
  VariantMap,
} from '@praxis-kit/core'
import type { UnknownProps } from './types/primitives'

export type SolidFactoryOptions<
  TDefault extends CoreElementType,
  Props extends UnknownProps,
  Variants extends Readonly<VariantMap>,
  TPreset extends RecipeMap<Variants> = NoPreset,
  TPlugin extends AnyClassPluginFactory = AnyClassPluginFactory,
> = FactoryOptions<TDefault, Props, Variants, TPreset, TPlugin> & {
  /**
   * Return true for any prop key that should be consumed but not forwarded to the DOM.
   * Receives `runtime.options.variantKeys` as a convenience if needed.
   */
  filterProps?: (key: string, variantKeys: ReadonlySet<string>) => boolean
}
