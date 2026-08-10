import type { VariantMap } from './variant'
import type {
  BaseClassOptions,
  CVASystemOptions,
  RecipeOptions,
  RecipeTarget,
  StringMap,
  StyleOptions,
  TagMapOptions,
} from '@praxis-kit/primitive'

export type {
  BaseClassOptions,
  CVASystemOptions,
  RecipeOptions,
  RecipeTarget,
  StyleOptions,
  TagMapOptions,
}

interface PrecomputedClassesOptions {
  /** Static variant-class map injected by `classExtractPlugin`. Keys use the same format as `VariantClassResolver` cache keys (variant-only props, sorted). */
  precomputedClasses?: Readonly<StringMap<string>>
}

export type CompositionOptions<TVariants extends VariantMap = VariantMap> = TagMapOptions &
  RecipeOptions<TVariants> &
  PrecomputedClassesOptions

export type ClassPipelineOptions<TVariants extends VariantMap = VariantMap> =
  StyleOptions<TVariants> & CompositionOptions<TVariants>
