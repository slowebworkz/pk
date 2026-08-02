import type { AnyRecord, EmptyRecord, NoVariants, VariantMap } from '@praxis-kit/core'
import type { Diagnostics } from '@praxis-kit/diagnostics'

export type UnknownProps = AnyRecord

// Resolved DOM attribute values built for spreading onto the host element (applyHostState
// in create-contract-component.ts) or serializing to a string (render-to-string.ts) —
// distinct role from UnknownProps (arbitrary input props) even though the shape is identical.
export type ResolvedAttributes = AnyRecord

/**
 * Constructor type returned by createContractComponent.
 *
 * Describes the public contract without exposing HTMLElement's internal members.
 * Variant key instance properties are typed via TVariants.
 */
export type WebContractComponent<
  TVariants extends Readonly<VariantMap> = NoVariants,
  TPluginProps extends AnyRecord = EmptyRecord,
> = {
  new (): HTMLElement & {
    as: string | undefined
    recipe: string | undefined
    praxisClass: string | undefined
    /** Re-runs the pipeline — call after setting non-reactive attributes (aria-*, role, data-*). */
    update(): void
  } & { [K in Extract<keyof TVariants, string>]?: string | null } & TPluginProps
  /** The resolved diagnostics for this component — usable by subclasses for custom enforcement. */
  readonly diagnostics: Diagnostics
}
