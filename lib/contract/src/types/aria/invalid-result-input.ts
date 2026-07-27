import type { DiagnosticInput } from '@praxis-kit/diagnostics'
import type { Severity } from './aria-rule'

/** Shared input shape for `invalidWithFix`/`invalidWithoutFix`. */
export type InvalidResultInput = {
  readonly severity: Severity
  readonly attribute?: string
  readonly message?: string
  readonly diagnostic?: DiagnosticInput
}
