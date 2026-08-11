import type { JSX } from 'solid-js'
import type { OmitIndexSignature, Simplify } from 'type-fest'
import type {
  ClassName,
  DefaultOf,
  ElementType,
  IntrinsicTag,
  PolymorphicGenerics,
  RecipeOf,
  PropsOf,
  VariantProps,
  VariantsOf,
} from '@praxis-kit/core'
import type { StringMap } from '@praxis-kit/primitive'
import type { SlotRenderFn, UnknownProps } from './primitives'

export type ElementRef<T extends ElementType> = T extends IntrinsicTag
  ? HTMLElementTagNameMap[T]
  : unknown

type IntrinsicJSXProps<T extends ElementType> = T extends IntrinsicTag
  ? JSX.IntrinsicElements[T]
  : UnknownProps

type ControlProps<G extends PolymorphicGenerics, TAs extends ElementType> = OmitIndexSignature<
  PropsOf<G>
> &
  OmitIndexSignature<VariantProps<VariantsOf<G>>> & {
    as?: TAs
    class?: ClassName | undefined
    recipe?: keyof RecipeOf<G>
    ref?: (el: ElementRef<TAs>) => void
  }

type SharedProps<G extends PolymorphicGenerics, TAs extends ElementType> = Omit<
  IntrinsicJSXProps<TAs>,
  keyof ControlProps<G, TAs> | 'children' | 'ref'
> &
  ControlProps<G, TAs>

// When asChild is true, intrinsic DOM props (type, href, …) are not required — the
// render function owns the element and its required attributes. PropsOf<G> (component
// defaults) is made Partial because those values are filled by the runtime; callers
// should not be forced to re-supply them. ref is typed loosely because the actual
// element type depends on what the render function produces.
type AsChildProps<G extends PolymorphicGenerics> = Partial<OmitIndexSignature<PropsOf<G>>> &
  OmitIndexSignature<VariantProps<VariantsOf<G>>> & {
    as?: never
    asChild: true
    children: SlotRenderFn
    class?: ClassName | undefined
    recipe?: keyof RecipeOf<G>
    ref?: unknown
  }

export type PolymorphicProps<
  G extends PolymorphicGenerics,
  TAs extends ElementType = DefaultOf<G>,
> = Simplify<(SharedProps<G, TAs> & { asChild?: false; children?: unknown }) | AsChildProps<G>>

export type PolymorphicComponent<G extends PolymorphicGenerics> = {
  <TAs extends ElementType = DefaultOf<G>>(props: PolymorphicProps<G, TAs>): JSX.Element

  /**
   * Non-generic fallback overload used for type extraction.
   *
   * TypeScript resolves conditional types such as
   * `ComponentProps<typeof Component>` against only the final overload.
   * Anchoring that overload to the default element preserves correct prop
   * inference for tools such as Storybook and `ComponentProps`.
   */
  (props: PolymorphicProps<G, DefaultOf<G>>): JSX.Element

  displayName?: string
}

/**
 * A `PolymorphicComponent<G>` with named sub-components attached, e.g.
 * `Card.Header`/`Card.Content`/`Card.Footer`.
 *
 * Intersecting named properties onto `PolymorphicComponent<G>`'s call
 * signature doesn't disturb it — `Card.Header` and friends are ordinary
 * object properties, not part of the call signature.
 */
export type CompoundComponent<
  G extends PolymorphicGenerics,
  S extends Readonly<StringMap<PolymorphicGenerics>>,
> = PolymorphicComponent<G> & {
  readonly [K in keyof S]: PolymorphicComponent<S[K]>
}

/**
 * A component's full prop contract — naming symmetry with React's/Preact's `ContractProps<T,
 * Mode>` (`@praxis-kit/contract-props`), not a fix for a gap: Solid has no version of the
 * overload-resolution ceiling those two adapters need a marker to work around. `PolymorphicProps<G,
 * TAs>` already folds both render modes into one unioned type (rather than two separate types the
 * way React/Preact split them), and `PolymorphicComponent<G>`'s fallback overload already returns
 * that whole union — so this alias is just `PolymorphicProps<G>` under a familiar name.
 */
export type ContractProps<G extends PolymorphicGenerics> = PolymorphicProps<G>
