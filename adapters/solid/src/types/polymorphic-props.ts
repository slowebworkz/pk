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
import type { SolidElement, UnknownProps } from './primitives'

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

/**
 * The exact props object an `asChild` render function receives at runtime, once defaults,
 * variant classes, and ARIA role resolution have all run — see `buildSlotProps` in `render.tsx`.
 * `PropsOf<G>` stays `Partial` for the same reason `AsChildProps` below does: the type system
 * can't prove every prop actually received a default, only that the runtime *tried*. `class` is
 * narrowed to a plain resolved `string` (not the wider `ClassName` a caller may pass in).
 *
 * `ref` is `(el: Element) => void` rather than `AsChildProps.ref`'s bare `unknown` — a render
 * function's own job is spreading this object directly onto a concrete element (`(props) => <a
 * {...props} />`), so it needs a callback-ref shape assignable to that element's own `ref` prop
 * type; contravariance makes an `Element`-typed callback assignable to any more specific one
 * (`(el: HTMLAnchorElement) => void`, etc.) without knowing `TAs` in advance. `AsChildProps.ref`
 * itself stays `unknown` on purpose — that field types what a *caller* hands in before the render
 * function has even run, not what the render function receives back out.
 *
 * `role` (the value `buildSlotProps` adds only when `isKnownAriaRole` narrows it) is deliberately
 * left OFF this type entirely, rather than given any explicit type. Every candidate representation
 * fails the same way `ref` almost did: Solid's own per-element JSX types (`AnchorHTMLAttributes
 * ['role']`, etc.) each narrow `role` to only the ARIA roles valid for *that* element, a strict
 * subset of the full ARIA vocabulary — so a `KnownAriaRole`-typed field fails to spread onto any
 * of them, and unlike `ref`, there's no contravariance trick available for a plain string-literal
 * property (`unknown` fails the same assignability check `KnownAriaRole` does; only `any` would
 * satisfy every per-element union, and this codebase doesn't use `any`). Omitting the key entirely
 * keeps `{...props}` spreads honest and compiling; a render function that specifically needs to
 * read `role` off this object needs an explicit, locally-scoped cast to do so. Previously this
 * whole parameter was bare `UnknownProps`, giving the render function no type checking at all.
 */
export type ResolvedSlotProps<G extends PolymorphicGenerics> = Partial<
  OmitIndexSignature<PropsOf<G>>
> &
  OmitIndexSignature<VariantProps<VariantsOf<G>>> & {
    class?: string | undefined
    ref?: (el: Element) => void
  }

/** An `asChild` render function, receiving the fully-resolved `ResolvedSlotProps<G>`. */
export type SlotRenderFn<G extends PolymorphicGenerics> = (
  props: ResolvedSlotProps<G>,
) => SolidElement

// When asChild is true, intrinsic DOM props (type, href, …) are not required — the
// render function owns the element and its required attributes. PropsOf<G> (component
// defaults) is made Partial because those values are filled by the runtime; callers
// should not be forced to re-supply them. ref is typed loosely because the actual
// element type depends on what the render function produces.
type AsChildProps<G extends PolymorphicGenerics> = Partial<OmitIndexSignature<PropsOf<G>>> &
  OmitIndexSignature<VariantProps<VariantsOf<G>>> & {
    as?: never
    asChild: true
    children: SlotRenderFn<G>
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
