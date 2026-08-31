import type { Diagnostics } from '@praxis-kit/diagnostics'
import type {
  AnyRecord,
  ElementForTag,
  ElementType,
  EmptyRecord,
  IntrinsicProps,
  SubComponentMap,
} from '../primitives'
import type { RecipeMap, VariantMap } from '../variants'
import type { AnyClassPluginFactory } from '../class'
import type { EnforcementOptions } from './enforcement-options'
import type { StylingOptions } from './styling-options'
import type { PropNormalizer } from './prop-normalizer'

export type { PropNormalizer }

// method-signature form gives bivariant assignability so NormalizeFn<Props> flows across adapter boundaries
export type NormalizeFn<Props extends AnyRecord = AnyRecord> = {
  normalize(props: Readonly<Props & IntrinsicProps>): Props & IntrinsicProps
}['normalize']

export type AnyFactoryOptions = FactoryOptions<
  ElementType,
  AnyRecord,
  VariantMap,
  RecipeMap<VariantMap>,
  AnyClassPluginFactory
>

export type FactoryOptions<
  TDefault extends ElementType = ElementType,
  Props extends AnyRecord = EmptyRecord,
  V extends Readonly<VariantMap> = Readonly<EmptyRecord>,
  TPreset extends RecipeMap<V> = Readonly<EmptyRecord>,
  TPlugin extends AnyClassPluginFactory = AnyClassPluginFactory,
  TAllowed extends ElementType = ElementType,
> = {
  /** The intrinsic tag the component renders by default. Overridable per instance via `as`. */
  readonly tag?: TDefault
  /** Display name used in diagnostics, dev tools, and generated component naming. */
  readonly name?: string
  /** Values used for the component's own (non-variant) props when the consumer omits them. */
  readonly defaults?: Partial<NoInfer<Props>>
  /**
   * A pure `(props) => props` transform run on every render, after `enforcement.props`'s
   * normalizers see the same input. Use this for component-specific prop shaping — anything
   * that depends on live instance state or the real DOM element belongs in `onElement` instead.
   *
   * Accepts either a single transform or an array of them, mirroring the `enforcement.props`
   * array convention. An array is composed left to right — each entry receives the previous
   * entry's *complete* output, not a merged patch — so unlike an `enforcement.props` normalizer
   * (which returns a partial patch), a later `normalize` entry can also remove a key an earlier
   * one added. An empty array is treated as no transform.
   */
  readonly normalize?: NormalizeFn<NoInfer<Props>> | ReadonlyArray<NormalizeFn<NoInfer<Props>>>
  /** Variant groups, base classes, presets, and the optional class-resolution plugin. */
  readonly styling?: StylingOptions<V, TPreset, TPlugin>
  /** ARIA rules, child-content contracts, and other runtime validation for this component. */
  readonly enforcement?: EnforcementOptions<TAllowed>
  /**
   * Adapter-resolved diagnostics default, spread in by `resolveAdapterCommonOptions`. Not meant to
   * be set directly by component authors — use `enforcement.diagnostics` to override per component.
   */
  readonly diagnostics?: Diagnostics
  /**
   * Sub-components to attach to the generated root component, producing a
   * compound component API (for example, `Card.Header`, `Card.Content`,
   * and `Card.Footer`). Purely additive — has no effect on
   * `enforcement.children`; author child rules explicitly if the component
   * needs to validate its children.
   */
  readonly subComponents?: SubComponentMap
  /**
   * Called once per instance, when the real underlying DOM element first
   * exists, in every adapter — via that adapter's own native mount
   * lifecycle, never through the props/attribute pipeline. Use this for
   * wiring that needs the actual element (native imperative methods like
   * `dialogEl.showModal()`, native events like `close`/`cancel` that have
   * no prop-based equivalent), not for anything expressible as a plain
   * prop.
   *
   * `element` is typed to the real DOM interface of every tag the rendered
   * element could actually be — `TDefault` plus whatever `enforcement.allowed`
   * permits via `as` (`HTMLDialogElement` for `tag: 'dialog'`,
   * `HTMLDetailsElement` for `tag: 'details'`, and so on) — no cast needed to
   * reach tag-specific members. A component that leaves `allowed`
   * unconstrained (any tag reachable via `as`) falls back to `HTMLElement`,
   * which still covers members every element shares (`showPopover()` and
   * friends); restrict `enforcement.allowed` to the tags `onElement`
   * actually knows how to handle to get real narrowing.
   *
   * `getProps` returns the instance's *current* resolved props at call
   * time — read it from inside a listener registered once at mount, rather
   * than re-subscribing on every prop change.
   *
   * Return a cleanup function to run when the instance unmounts.
   */
  readonly onElement?: (
    element: ElementForTag<TDefault | TAllowed>,
    getProps: () => Readonly<Props>,
  ) => void | (() => void)
}
