// Contract runtime layer — ARIA enforcement, children validation, strict mode.
// Includes everything from the primitive entry.
export * from './primitive'
export * from './html'
export * from './state'
export { InvariantBase } from '@praxis-kit/contract'
export {
  AriaDiagnostics,
  ContractDiagnostics,
  HtmlDiagnostics,
  SlotDiagnostics,
} from '@praxis-kit/contract'
export { disabledProps, invalidProps } from '@praxis-kit/contract'
export {
  AriaPolicyEngine,
  ChildrenEvaluator,
  isInvalid,
  isAriaAttributeValidForRole,
  isGlobalAriaAttribute,
  getImplicitRole,
  hasStandaloneRole,
  isStrongImplicitRole,
  KNOWN_ARIA_ROLES,
  isKnownAriaRole,
  hasRole,
  createRemoveAttributeRule,
  invalidWithFix,
  invalidWithoutFix,
  removeAttributeFix,
} from '@praxis-kit/contract'
export { createResolverPipeline } from './resolver'
export type {
  AriaContext,
  AriaFix,
  AriaFixResult,
  AriaPhase,
  AriaResult,
  AriaRule,
  FixKind,
  RemoveAttributeFixKind,
  InvalidResult,
  InvalidWithFix,
  InvalidWithoutFix,
  Severity,
  ValidResult,
  Cardinality,
  CardinalityInput,
  ChildRuleInput,
  ChildRuleMatch,
  ChildRulePosition,
  MatchMatrix,
  NormalizedChildRule,
  ResolveInput,
  ResolveOutput,
  ResolverOptions,
  EvaluationContext,
  NormalizationResult,
  ValidationResult,
  ValidationViolation,
} from './types'
