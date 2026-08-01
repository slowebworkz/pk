import type { Diagnostics } from '@praxis-kit/diagnostics'
import type {
  AnyRecord,
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
  readonly tag?: TDefault
  readonly name?: string
  readonly defaults?: Partial<NoInfer<Props>>
  readonly normalize?: NormalizeFn<NoInfer<Props>>
  readonly styling?: StylingOptions<V, TPreset, TPlugin>
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
}
