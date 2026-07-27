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
  IntrinsicProps,
  NormalizeFn,
  PropNormalizer,
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
