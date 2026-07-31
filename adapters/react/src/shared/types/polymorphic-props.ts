import type { NonEmptyTuple, Simplify } from 'type-fest'
import type { JSX, ReactElement, ReactNode, Ref } from 'react'
import type {
  AllowedOf,
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
import type { RenderCallbackProps } from './props'
import type { UnknownProps } from './primitives'

/**
 * Resolves the instance type exposed through `ref` for a polymorphic
 * element.
 *
 * Intrinsic HTML elements map to their corresponding DOM element type;
 * custom React components currently resolve to `unknown`.
 */
export type ElementRef<T extends ElementType> = T extends IntrinsicTag
  ? HTMLElementTagNameMap[T]
  : unknown

/**
 * React's intrinsic JSX props for an element type.
 *
 * Custom components intentionally resolve to `UnknownProps`; their own
 * prop definitions determine the accepted props.
 */
type IntrinsicJSXProps<T extends ElementType> = T extends IntrinsicTag
  ? JSX.IntrinsicElements[T]
  : UnknownProps

/**
 * Removes index signatures while preserving explicitly declared
 * properties.
 *
 * Prevents broad index signatures (for example `Record<string, unknown>`)
 * from causing `keyof T` to become `string`, which would otherwise erase
 * every intrinsic prop during `Omit`.
 */
type StripIndexSignature<T> = {
  [K in keyof T as string extends K ? never : K]: T[K]
}

/** Props explicitly declared by the component. */
type ComponentProps<G extends PolymorphicGenerics> = StripIndexSignature<PropsOf<G>>

/** Variant props generated from the component's variant definitions. */
type ComponentVariants<G extends PolymorphicGenerics> = StripIndexSignature<
  VariantProps<VariantsOf<G>>
>

/**
 * Props defined by the component itself.
 *
 * These override intrinsic JSX props with the same name.
 */
type OwnedProps<G extends PolymorphicGenerics> = ComponentProps<G> & ComponentVariants<G>

/**
 * Props that control how the component renders.
 *
 * `children` and `asChild` are intentionally omitted so each render
 * strategy can define its own contract.
 */
type PolymorphicControlProps<G extends PolymorphicGenerics, TAs extends ElementType> = {
  /**
   * Restrict `as` to `allowedAs` when configured.
   *
   * Without `allowedAs`, `AllowedOf<G>` resolves to `ElementType`,
   * so the intersection becomes `TAs`.
   */
  as?: TAs & AllowedOf<G>

  /**
   * Explicit `undefined` keeps wrapper components compatible with
   * `exactOptionalPropertyTypes`.
   */
  className?: ClassName | undefined

  recipe?: keyof RecipeOf<G>

  /** Ref type follows the resolved element. */
  ref?: Ref<ElementRef<TAs>>
}

/**
 * All props reserved by the polymorphic component.
 *
 * Used primarily to exclude conflicting intrinsic JSX props.
 */
type ControlProps<G extends PolymorphicGenerics, TAs extends ElementType> = OwnedProps<G> &
  PolymorphicControlProps<G, TAs>

/**
 * Intrinsic JSX props after removing every reserved component prop.
 *
 * Component-defined props always take precedence.
 */
type IntrinsicPropsWithoutOwned<G extends PolymorphicGenerics, TAs extends ElementType> = Omit<
  IntrinsicJSXProps<TAs>,
  keyof ControlProps<G, TAs> | 'children'
>

/**
 * Props shared by every rendering strategy.
 *
 * Each render mode contributes only its discriminating props.
 */
type BaseProps<G extends PolymorphicGenerics, TAs extends ElementType> = IntrinsicPropsWithoutOwned<
  G,
  TAs
> &
  ControlProps<G, TAs>

/** Standard rendering (`asChild` absent or false). */
type NormalRenderMode = {
  asChild?: false
  children?: ReactNode | undefined
}

/**
 * Slot rendering.
 *
 * Requires one or more React elements and forbids `as`, since the child
 * determines the rendered element.
 */
type SlotRenderMode = {
  asChild: true
  as?: never
  children: ReactElement | NonEmptyTuple<ReactElement>
}

/**
 * Render callback mode.
 *
 * Receives the fully resolved props and returns the rendered element.
 */
type CallbackRenderMode = {
  render: (props: RenderCallbackProps) => ReactElement
  asChild?: never
  children?: never
}

/**
 * Standard polymorphic props.
 *
 * HTML attributes are inferred from `as`.
 */
export type PolymorphicProps<
  G extends PolymorphicGenerics,
  TAs extends ElementType = DefaultOf<G>,
> = Simplify<BaseProps<G, TAs> & NormalRenderMode>

/**
 * Slot rendering props.
 *
 * Requires one or more ReactElement children.
 */
export type PolymorphicWithAsChild<
  G extends PolymorphicGenerics,
  TAs extends ElementType = DefaultOf<G>,
> = Simplify<BaseProps<G, TAs> & SlotRenderMode>

/**
 * Render callback props.
 */
export type PolymorphicWithRender<
  G extends PolymorphicGenerics,
  TAs extends ElementType = DefaultOf<G>,
> = Simplify<BaseProps<G, TAs> & CallbackRenderMode>

/**
 * A polymorphic React component.
 *
 * Overloads provide three rendering strategies:
 *
 * - `render`   — render callback
 * - `asChild`  — slot rendering
 * - default    — standard polymorphic rendering
 */
export type PolymorphicComponent<G extends PolymorphicGenerics> = {
  <TAs extends ElementType = DefaultOf<G>>(props: PolymorphicWithRender<G, TAs>): ReactElement

  <TAs extends ElementType = DefaultOf<G>>(props: PolymorphicWithAsChild<G, TAs>): ReactElement

  <TAs extends ElementType = DefaultOf<G>>(props: PolymorphicProps<G, TAs>): ReactElement

  /**
   * Non-generic fallback overload used for type extraction.
   *
   * TypeScript resolves conditional types such as
   * `React.ComponentProps<typeof Component>` against only the final
   * overload. Anchoring that overload to the default element preserves
   * correct prop inference for tools such as Storybook and
   * `React.ComponentProps`.
   */
  (props: PolymorphicProps<G, DefaultOf<G>>): ReactElement

  displayName?: string
}

/**
 * A `PolymorphicComponent<G>` with named sub-components attached, e.g.
 * `Card.Header`/`Card.Content`/`Card.Footer`.
 *
 * Intersecting named properties onto `PolymorphicComponent<G>` doesn't
 * disturb its call signatures, so `React.ComponentProps<typeof Card>`
 * extraction keeps resolving the root's own props exactly as it does for a
 * plain `PolymorphicComponent<G>` — `Card.Header` and friends are ordinary
 * object properties, not additional call signatures.
 */
export type CompoundComponent<
  G extends PolymorphicGenerics,
  S extends Readonly<Record<string, PolymorphicGenerics>>,
> = PolymorphicComponent<G> & {
  readonly [K in keyof S]: PolymorphicComponent<S[K]>
}
