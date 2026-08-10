import type { DiagnosticInput } from '@praxis-kit/diagnostics'
import { DiagnosticCategory, DiagnosticCode } from '@praxis-kit/diagnostics'
import type { DiagnosticTemplateMap } from './types'

/**
 * ESLint-compatible `{{ }}` template strings for meta.messages.
 * Rules source their message text from here rather than constructing it inline.
 */
export const EslintDiagnosticTemplates = {
  // HTML structural rules
  redundantRole:
    'role="{{ role }}" is redundant on <{{ tag }}>: the element already carries this implicit ARIA role. Remove the attribute.',
  invalidChild:
    '<{{ child }}> is not a valid direct child of <{{ parent }}>. Allowed: {{ allowed }}.',

  // Compound variant rules
  deadCompoundKey:
    '"{{ key }}" is not a variant defined in styling.variants. This compound condition can never match.',
  deadCompoundValue:
    '"{{ value }}" is not a valid value for variant "{{ key }}". Expected one of: {{ allowed }}. This compound condition can never match.',
  deadCompoundNonLiteral:
    'Compound value for "{{ key }}" is not a string literal and cannot be statically validated.',

  // Enforcement rules
  missingStrict:
    'enforcement.{{ field }} is defined but enforcement.diagnostics is not explicitly set. Pass a Diagnostics instance (e.g. warnDiagnostics, throwDiagnostics) so the enforcement behavior is clear at the call site.',

  // Default value rules
  invalidDefaultKey:
    '"{{ key }}" is not a variant defined in styling.variants. This default will have no effect.',
  invalidDefaultValue:
    '"{{ value }}" is not a valid value for variant "{{ key }}". Expected one of: {{ allowed }}. This default will have no effect.',
  invalidDefaultNonLiteral:
    'Default value for "{{ key }}" is not a string literal and cannot be statically validated.',

  // Cardinality rules
  negativeMin: 'cardinality.min must be >= 0 (got {{ value }}).',
  negativeMax: 'cardinality.max must be >= 0 (got {{ value }}).',
  maxLessThanMin:
    'cardinality.max ({{ max }}) must be >= cardinality.min ({{ min }}). This rule can never be satisfied.',
  zeroMax:
    'cardinality.max of 0 means no children of this type are allowed. Use 0 intentionally or remove the rule.',

  // Children config rules
  multipleFirst:
    'Multiple enforcement.children rules require position: "first". Only one child can occupy the first position.',
  multipleLast:
    'Multiple enforcement.children rules require position: "last". Only one child can occupy the last position.',
  minSumExceedsCapacity:
    'A rule with position: "only" requires min >= 1, but {{ count }} other rule(s) also require min >= 1. These constraints cannot be satisfied simultaneously.',
} as const satisfies DiagnosticTemplateMap

/**
 * Factory functions returning DiagnosticInput for use with the diagnostics reporting system.
 */
export const EslintDiagnostics = {
  // HTML structural rules
  redundantRole(tag: string, role: string): DiagnosticInput {
    return {
      code: DiagnosticCode.HtmlImplicitRoleRedundant,
      category: DiagnosticCategory.HTML,
      message: `role="${role}" is redundant on <${tag}>: the element already carries this implicit ARIA role. Remove the attribute.`,
    }
  },

  invalidChild(child: string, parent: string, allowed: string): DiagnosticInput {
    return {
      code: DiagnosticCode.HtmlInvalidChild,
      category: DiagnosticCategory.HTML,
      message: `<${child}> is not a valid direct child of <${parent}>. Allowed: ${allowed}.`,
    }
  },

  // Compound variant rules
  deadCompoundKey(key: string): DiagnosticInput {
    return {
      code: DiagnosticCode.LintDeadCompoundKey,
      category: DiagnosticCategory.Lint,
      message: `"${key}" is not a variant defined in styling.variants. This compound condition can never match.`,
    }
  },

  deadCompoundValue(key: string, value: string, allowed: string): DiagnosticInput {
    return {
      code: DiagnosticCode.LintDeadCompoundValue,
      category: DiagnosticCategory.Lint,
      message: `"${value}" is not a valid value for variant "${key}". Expected one of: ${allowed}. This compound condition can never match.`,
    }
  },

  deadCompoundNonLiteral(key: string): DiagnosticInput {
    return {
      code: DiagnosticCode.LintDeadCompoundNonLiteral,
      category: DiagnosticCategory.Lint,
      message: `Compound value for "${key}" is not a string literal and cannot be statically validated.`,
    }
  },

  // Enforcement rules
  missingStrict(field: string): DiagnosticInput {
    return {
      code: DiagnosticCode.LintMissingStrict,
      category: DiagnosticCategory.Lint,
      message: `enforcement.${field} is defined but enforcement.strict is not explicitly set. Adapter defaults vary — declare strict explicitly so the behavior is clear at the call site.`,
    }
  },

  // Default value rules
  invalidDefaultKey(key: string): DiagnosticInput {
    return {
      code: DiagnosticCode.LintInvalidDefaultKey,
      category: DiagnosticCategory.Lint,
      message: `"${key}" is not a variant defined in styling.variants. This default will have no effect.`,
    }
  },

  invalidDefaultValue(key: string, value: string, allowed: string): DiagnosticInput {
    return {
      code: DiagnosticCode.LintInvalidDefaultValue,
      category: DiagnosticCategory.Lint,
      message: `"${value}" is not a valid value for variant "${key}". Expected one of: ${allowed}. This default will have no effect.`,
    }
  },

  invalidDefaultNonLiteral(key: string): DiagnosticInput {
    return {
      code: DiagnosticCode.LintInvalidDefaultNonLiteral,
      category: DiagnosticCategory.Lint,
      message: `Default value for "${key}" is not a string literal and cannot be statically validated.`,
    }
  },

  // Cardinality rules
  negativeMin(value: number): DiagnosticInput {
    return {
      code: DiagnosticCode.LintNegativeMin,
      category: DiagnosticCategory.Lint,
      message: `cardinality.min must be >= 0 (got ${value}).`,
    }
  },

  negativeMax(value: number): DiagnosticInput {
    return {
      code: DiagnosticCode.LintNegativeMax,
      category: DiagnosticCategory.Lint,
      message: `cardinality.max must be >= 0 (got ${value}).`,
    }
  },

  maxLessThanMin(min: number, max: number): DiagnosticInput {
    return {
      code: DiagnosticCode.LintMaxLessThanMin,
      category: DiagnosticCategory.Lint,
      message: `cardinality.max (${max}) must be >= cardinality.min (${min}). This rule can never be satisfied.`,
    }
  },

  zeroMax(): DiagnosticInput {
    return {
      code: DiagnosticCode.LintZeroMax,
      category: DiagnosticCategory.Lint,
      message: `cardinality.max of 0 means no children of this type are allowed. Use 0 intentionally or remove the rule.`,
    }
  },

  // Children config rules
  multipleFirst(): DiagnosticInput {
    return {
      code: DiagnosticCode.LintMultipleFirst,
      category: DiagnosticCategory.Lint,
      message: `Multiple enforcement.children rules require position: "first". Only one child can occupy the first position.`,
    }
  },

  multipleLast(): DiagnosticInput {
    return {
      code: DiagnosticCode.LintMultipleLast,
      category: DiagnosticCategory.Lint,
      message: `Multiple enforcement.children rules require position: "last". Only one child can occupy the last position.`,
    }
  },

  minSumExceedsCapacity(count: number): DiagnosticInput {
    return {
      code: DiagnosticCode.LintMinSumExceedsCapacity,
      category: DiagnosticCategory.Lint,
      message: `A rule with position: "only" requires min >= 1, but ${count} other rule(s) also require min >= 1. These constraints cannot be satisfied simultaneously.`,
    }
  },
}
