import type { JSX, Ref } from 'preact'
import type { AnyVNode } from './primitives'
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
import type { HasGenerics, Mode, PickMode } from '@praxis-kit/contract-props'
import type { UnknownProps } from './primitives'

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
    className?: ClassName | undefined
    recipe?: keyof RecipeOf<G>
    ref?: Ref<ElementRef<TAs>>
  }

type SharedProps<G extends PolymorphicGenerics, TAs extends ElementType> = Omit<
  IntrinsicJSXProps<TAs>,
  keyof ControlProps<G, TAs> | 'children'
> &
  ControlProps<G, TAs>

export type PolymorphicProps<
  G extends PolymorphicGenerics,
  TAs extends ElementType = DefaultOf<G>,
> = Simplify<SharedProps<G, TAs> & { asChild?: false; children?: unknown }>

export type PolymorphicWithAsChild<
  G extends PolymorphicGenerics,
  TAs extends ElementType = DefaultOf<G>,
> = Simplify<
  SharedProps<G, TAs> & {
    asChild: true
    as?: never
    children: AnyVNode | AnyVNode[]
  }
>

export type PolymorphicComponent<G extends PolymorphicGenerics> = {
  <TAs extends ElementType = DefaultOf<G>>(props: PolymorphicWithAsChild<G, TAs>): AnyVNode
  <TAs extends ElementType = DefaultOf<G>>(props: PolymorphicProps<G, TAs>): AnyVNode

  /**
   * Non-generic fallback overload used for type extraction.
   *
   * TypeScript resolves conditional types such as
   * `ComponentProps<typeof Component>` against only the final overload.
   * Anchoring that overload to the default element preserves correct prop
   * inference for tools such as Storybook and `ComponentProps`.
   */
  (props: PolymorphicProps<G, DefaultOf<G>>): AnyVNode

  /**
   * Type-only; never assigned at runtime. See `HasGenerics<G>` (`@praxis-kit/contract-props`) for
   * the full rationale — kept as an inline field rather than `HasGenerics<G> & {...}` because
   * intersecting it onto this callable type changes how `PolymorphicComponent<any>` resolves
   * against concrete instantiations (confirmed for React's identical shape,
   * `adapters/react/src/shared/types/polymorphic-props.test.ts`); structurally identical to
   * `HasGenerics<G>` either way, which is what lets `ContractProps` constrain against it.
   */
  readonly __generics?: G

  displayName?: string
}

/**
 * A `PolymorphicComponent<G>` with named sub-components attached, e.g.
 * `Card.Header`/`Card.Content`/`Card.Footer`.
 *
 * Intersecting named properties onto `PolymorphicComponent<G>` doesn't
 * disturb its call signatures, so `ComponentProps<typeof Card>`-style
 * extraction keeps resolving the root's own props exactly as it does for a
 * plain `PolymorphicComponent<G>` — `Card.Header` and friends are ordinary
 * object properties, not additional call signatures.
 */
export type CompoundComponent<
  G extends PolymorphicGenerics,
  S extends Readonly<StringMap<PolymorphicGenerics>>,
> = PolymorphicComponent<G> & {
  readonly [K in keyof S]: PolymorphicComponent<S[K]>
}

/**
 * Recovers a built `PolymorphicComponent<G>`'s prop shape for a specific render mode, from
 * outside the file that built it — the missing piece `ComponentProps<typeof Component>` can't
 * provide, since it always resolves against `PolymorphicComponent`'s normal-mode fallback
 * overload (see that type's own doc comment).
 *
 * No `'render'` mode — Preact has no render-callback render strategy, unlike React.
 *
 * ```tsx
 * const Container = createContractComponent({ tag: 'div', name: 'Container', /* ... *\/ })
 *
 * // Normal-mode props (equivalent to ComponentProps<typeof Container>, but works for asChild too):
 * type ContainerProps = ContractProps<typeof Container>
 *
 * // A wrapper that always renders Container with asChild — ComponentProps<typeof Container>
 * // fails here ("Type 'true' is not assignable to type 'false'"); ContractProps doesn't.
 * type ContainerAsChildProps = ContractProps<typeof Container, 'asChild'>
 * ```
 */
export type ContractProps<
  T extends HasGenerics<PolymorphicGenerics>,
  M extends Exclude<Mode, 'render'> = 'normal',
> =
  T extends HasGenerics<infer G extends PolymorphicGenerics>
    ? PickMode<M, PolymorphicProps<G, DefaultOf<G>>, PolymorphicWithAsChild<G, DefaultOf<G>>, never>
    : never
