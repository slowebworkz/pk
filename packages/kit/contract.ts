// Users receive Diagnostics instances in plugin factory signatures; exporting
// the type lets them annotate standalone plugins. Construction stays internal:
// an alias (not a re-export) keeps the class constructor out of the d.ts value
// space — rollup-plugin-dts turns `export type { X }` into a value export.
import type { Diagnostics as DiagnosticsClass } from '@praxis-kit/diagnostics'
export {
  activeProps,
  disabledProps,
  expandedProps,
  invalidProps,
  loadingProps,
  pressedProps,
  readonlyProps,
  selectedProps,
} from '@praxis-kit/core'
export type {
  AnyFactoryOptions,
  // The generic authoring type. `satisfies FactoryOptions<'textarea', Props, typeof variants>`
  // in a framework-neutral `create.ts` narrows `styling.compounds` conditions to the real
  // variant shape — including resolving a boolean-shaped axis (`{ true, false }`) to a real
  // `boolean` — which the type-erased `AnyFactoryOptions` cannot. See PRAXIS-KIT-FINDINGS.md
  // #29/#35.
  EnforcementOptions,
  FactoryOptions,
  IntrinsicProps,
  NormalizeFn,
  PropNormalizer,
  StylingOptions,
} from '@praxis-kit/core'
export type Diagnostics = DiagnosticsClass
export {
  activeContract,
  disabledContract,
  expandedContract,
  invalidContract,
  loadingContract,
  pressedContract,
  readonlyContract,
  selectedContract,
  mergeContracts,
} from '@praxis-kit/core/contract'
export {
  createRemoveAttributeRule,
  invalidWithFix,
  invalidWithoutFix,
  removeAttributeFix,
} from '@praxis-kit/core/contract'
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
} from '@praxis-kit/core/contract'
