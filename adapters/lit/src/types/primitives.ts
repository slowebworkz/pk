import type {
  AnyRecord,
  EmptyRecord,
  MergeRecords,
  NoVariants,
  PolymorphicGenerics,
  VariantMap,
} from '@praxis-kit/core'
import type { LitElement } from 'lit'

export type PolymorphicElement<G extends PolymorphicGenerics> = HTMLElement &
  G['props'] & {
    readonly as?: G['default']
  }

export type UnknownProps = AnyRecord

// Resolved DOM attribute values about to be serialized (render-to-string.ts) or
// applied to a host element (applyHostState in create-contract-component.ts).
export type ResolvedAttributes = AnyRecord

/**
 * Constructor type returned by createContractComponent.
 *
 * Describes the class contract without exposing LitElement's private members
 * (which would trigger TS4094 in declaration emit). Variant key instance
 * properties are typed via the TVariants parameter.
 */
export type LitContractComponent<
  TVariants extends Readonly<VariantMap> = NoVariants,
  TPluginProps extends AnyRecord = EmptyRecord,
> = {
  new (): MergeRecords<
    LitElement & {
      as: string | undefined
      recipe: string | undefined
      praxisClass: string | undefined
    } & { [K in Extract<keyof TVariants, string>]?: string | null },
    TPluginProps
  >
}
