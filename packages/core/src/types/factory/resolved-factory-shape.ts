import type {
  AnyRecord,
  ElementType,
  RecipeMap,
  ResolvedFactoryOptions,
  VariantMap,
} from '@praxis-kit/primitive'

/** The erased/common `ResolvedFactoryOptions` shape every render pipeline is built from. */
export type ResolvedFactoryShape = ResolvedFactoryOptions<
  ElementType,
  AnyRecord,
  VariantMap,
  RecipeMap<VariantMap>
>
