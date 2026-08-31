import type { AriaFix } from './aria-fix'
import type { Severity } from './severity'
import type { ValidResult } from '../validation'
import type { DiagnosticInput } from '@praxis-kit/diagnostics'

type AriaInvalidBase<M extends string = string> = {
  valid: false
  severity: Severity
  message?: M
  attribute?: string
  diagnostic?: DiagnosticInput
}

export type AriaInvalidWithFix<M extends string = string> = AriaInvalidBase<M> & {
  fixable: true
  fix: AriaFix
}

export type AriaInvalidWithoutFix<M extends string = string> = AriaInvalidBase<M> & {
  fixable: false
}

export type AriaInvalidResult<M extends string = string> =
  AriaInvalidWithFix<M> | AriaInvalidWithoutFix<M>

export type AriaResult = ValidResult | AriaInvalidResult

export type AriaPhase = 'evaluate' | 'fix'
