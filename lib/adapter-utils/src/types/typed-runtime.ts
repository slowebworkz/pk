import type {
  DefaultOf,
  PolymorphicGenerics,
  PropsOf,
  RecipeOf,
  VariantsOf,
  createPolymorphic2,
} from '@praxis-kit/core'

/**
 * The typed runtime produced by a polymorphic component factory.
 *
 * This is the canonical runtime type used by adapters. It mirrors the runtime
 * returned by {@link createPolymorphic2}, providing a single authoritative
 * definition for adapter implementations and adapter authors.
 *
 * @typeParam G - The polymorphic generics describing the component.
 */
export type TypedRuntime<G extends PolymorphicGenerics> = ReturnType<
  typeof createPolymorphic2<DefaultOf<G>, PropsOf<G>, VariantsOf<G>, RecipeOf<G>>
>
