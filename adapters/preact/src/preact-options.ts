import type {
  AnyClassPluginFactory,
  ElementType as CoreElementType,
  FactoryOptions,
  NoPreset,
  RecipeMap,
  VariantMap,
} from '@praxis-kit/core'
import type { SlotComponent, UnknownProps } from './types/primitives'

export type PreactFactoryOptions<
  TDefault extends CoreElementType,
  Props extends UnknownProps,
  Variants extends Readonly<VariantMap>,
  TPreset extends RecipeMap<Variants> = NoPreset,
  TPlugin extends AnyClassPluginFactory = AnyClassPluginFactory,
> = FactoryOptions<TDefault, Props, Variants, TPreset, TPlugin> & {
  /** Component used to render the asChild slot. Defaults to the built-in Slot. */
  slotComponent?: SlotComponent
  /**
   * Return true for any prop key that should be consumed but not forwarded to the DOM.
   * Receives `runtime.options.variantKeys` as a convenience if needed.
   */
  filterProps?: (key: string, variantKeys: ReadonlySet<string>) => boolean
}
