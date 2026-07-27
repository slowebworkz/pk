import type { DiagnosticInput } from '@praxis-kit/diagnostics'
import type { AriaContext, Severity } from './aria-rule'

/** Options for `createRemoveAttributeRule`. */
export type RemoveAttributeRuleOptions = {
  /** Returns true when `attribute` should be stripped for the given render. */
  readonly when: (context: AriaContext) => boolean
  readonly severity?: Severity
  readonly message?: string
  /** Receives the same context `when` did, so the diagnostic can reference the offending value. */
  readonly diagnostic?: (context: AriaContext) => DiagnosticInput
  readonly readsProps?: readonly string[]
  readonly tags?: readonly string[]
}
