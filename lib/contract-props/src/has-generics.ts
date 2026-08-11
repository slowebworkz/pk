/**
 * The phantom-marker shape read back via `T extends HasGenerics<infer G> ? G : never`. See the
 * README for why this exists.
 *
 * Type-only: never assigned at runtime. In React's `PolymorphicComponent<G>`, declaring `readonly
 * __generics?: G` inline (structurally matching this shape) rather than writing `HasGenerics<G> &
 * { ...call signatures... }` was necessary to keep `PolymorphicComponent<any>`-typed test helpers
 * assignable — confirmed directly against that adapter's own real component type (see
 * `adapters/react/src/shared/types/polymorphic-props.test.ts`), not reproducible in an isolated
 * minimal mock (see this file's own `has-generics.test.ts`), so treat "inline, not intersected"
 * as an adapter-level implementation detail this package's marker shape must stay compatible
 * with, not a property `HasGenerics<G>` itself enforces.
 */
export interface HasGenerics<G> {
  readonly __generics?: G
}
