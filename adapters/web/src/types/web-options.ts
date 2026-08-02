import type {
  AnyClassPluginFactory,
  AnyRecord,
  ElementType,
  EmptyRecord,
  FactoryOptions,
  NoPreset,
  NoVariants,
  RecipeMap,
  VariantMap,
} from '@praxis-kit/core'
import type { FilterPredicate } from '@praxis-kit/adapter-utils'

/**
 * Options accepted by createContractComponent in the web adapter.
 *
 * Identical shape to LitFactoryOptions — a plain HTMLElement subclass with
 * no framework dependency. Light DOM only; Shadow DOM is out of scope.
 */
export type WebFactoryOptions<
  TDefault extends ElementType = ElementType,
  TProps extends AnyRecord = EmptyRecord,
  TVariants extends Readonly<VariantMap> = NoVariants,
  TPreset extends RecipeMap<TVariants> = NoPreset,
  TPlugin extends AnyClassPluginFactory = AnyClassPluginFactory,
> = FactoryOptions<TDefault, TProps, TVariants, TPreset, TPlugin> & {
  readonly filterProps?: FilterPredicate
}
