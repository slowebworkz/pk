import type { AnyRecord, ElementType, EmptyRecord } from '../primitives'
import type { RecipeMap } from './recipe-map'
import type { VariantMap } from './variant-map'

/**
 * The framework-neutral descriptor for a single praxis-kit component's contract — every render
 * mechanism (tag resolution, prop merging, classes, ARIA) and every framework adapter's
 * component type is built from this one shape. Deliberately just data: five type parameters and
 * their corresponding properties, with no notion of JSX, call signatures, refs, or any
 * framework-specific rendering concern. Each adapter (React, Vue, Svelte, Solid, Lit, Web) builds
 * its own idiomatic component type on top of a `PolymorphicGenerics<...>` instantiation — see
 * `PolymorphicComponent<G>` (`adapters/react/src/shared/types/polymorphic-props.ts`) for the
 * React example — rather than this interface knowing anything about any of them.
 *
 * Use the `*Of<T>` accessor aliases below (`DefaultOf<G>`, `PropsOf<G>`, etc.) to read a single
 * field back out of an already-resolved `G`, instead of indexing `G['default']` etc. directly at
 * call sites — same rationale as any accessor: the property name stays an implementation detail,
 * and every reader benefits together if it ever needs to change.
 */
export interface PolymorphicGenerics<
  /**
   * The element/tag this component renders as when the consumer doesn't override it via `as`
   * (`AllowedOf<G>` permitting) — e.g. `'button'`, `'div'`. Defaults to the widest `ElementType`
   * so a generic `PolymorphicGenerics` reference (with nothing else specified) still compiles.
   */
  TDefault extends ElementType = ElementType,
  /**
   * The props this specific component declares — its own contract, before variants are mixed
   * in. Defaults to `AnyRecord` for the same "still compiles unspecified" reason as `TDefault`.
   */
  Props extends AnyRecord = AnyRecord,
  /**
   * This component's variant definitions (e.g. `{ intent: { primary: ..., ghost: ... } }`).
   * Constrained to `Readonly<VariantMap>` — not the wider `AnyRecord` — specifically so `TPreset`
   * below can be expressed as `RecipeMap<Variants>` and get real per-variant-key checking,
   * instead of falling back to an unconstrained `RecipeMap<VariantMap>`.
   */
  Variants extends Readonly<VariantMap> = Readonly<VariantMap>,
  /**
   * Named presets (`RecipeMap<Variants>`) — bundles of variant selections a consumer activates
   * by key instead of repeating the same variant combination at every call site. Tied to
   * `Variants`, not `AnyRecord`, precisely so a preset can only ever select keys/values that
   * `Variants` actually defines — an invalid preset is a type error, not a silent no-op.
   * Defaults to `Readonly<EmptyRecord>` (no presets), which is the common case: a component can
   * have variants without necessarily defining any named presets over them, and most don't.
   */
  TPreset extends RecipeMap<Variants> = Readonly<EmptyRecord>,
  /**
   * The set of elements/tags a consumer is allowed to switch to via `as`. Defaults to the widest
   * `ElementType`, under which `AllowedOf<G>` imposes no restriction at all (see
   * `PolymorphicControlProps.as`'s own comment in the React adapter for the concrete effect this
   * has at a component's actual call site).
   */
  TAllowed extends ElementType = ElementType,
> {
  default: TDefault
  props: Props
  variants: Variants
  preset: TPreset
  allowed: TAllowed
}

/** This component's variant definitions. See `PolymorphicGenerics`'s `Variants` parameter. */
export type VariantsOf<T extends PolymorphicGenerics> = T['variants']

/** This component's named presets. See `PolymorphicGenerics`'s `TPreset` parameter. */
export type RecipeOf<T extends PolymorphicGenerics> = T['preset']

/** The set of elements/tags this component may render as via `as`. See `PolymorphicGenerics`'s
 *  `TAllowed` parameter. */
export type AllowedOf<T extends PolymorphicGenerics> = T['allowed']

/** The element/tag this component renders as by default. See `PolymorphicGenerics`'s `TDefault`
 *  parameter. */
export type DefaultOf<T extends PolymorphicGenerics> = T['default']

/** This component's own declared props, before variants are mixed in. See `PolymorphicGenerics`'s
 *  `Props` parameter. */
export type PropsOf<T extends PolymorphicGenerics> = T['props']
