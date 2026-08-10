import type { StringMap } from '@praxis-kit/primitive'

/** Shape of `EslintDiagnosticTemplates` — ESLint-compatible `{{ }}` template strings keyed by
 *  message id. */
export type DiagnosticTemplateMap = StringMap<string>
