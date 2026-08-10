import type { DiagnosticInput } from '@praxis-kit/diagnostics'
import { DiagnosticCategory, DiagnosticCode } from '@praxis-kit/diagnostics'
import type { Severity as AriaSeverity, StringMap } from '@praxis-kit/primitive'

// A fixed-severity fact about HTML/ARIA-in-HTML validity. The same diagnostic always carries the
// same severity, so it's declared once here rather than re-decided at every call site — callers
// (`AriaRule` implementations) just forward `diagnostic.severity` into the `AriaResult` they
// return. `AriaSeverity` ('error' | 'warning') is the string-literal severity `AriaResult`/
// `Diagnostics.report()` actually branch on — distinct from `@praxis-kit/diagnostics`' numeric
// `Severity` enum used by `Diagnostic` itself.
type Fact = DiagnosticInput & { readonly severity: AriaSeverity }

// One `DiagnosticCode` per attribute (HTML3102–3111, see `codes.ts`) rather than one shared code —
// each is independently documentable/lookupable, the same way a compiler assigns a distinct code
// per diagnosable fact rather than one generic "type error" code.
const ATTRIBUTE_IGNORED_CODES: Readonly<StringMap<DiagnosticCode>> = {
  checked: DiagnosticCode.HtmlInputCheckedIgnoredForType,
  multiple: DiagnosticCode.HtmlInputMultipleIgnoredForType,
  maxLength: DiagnosticCode.HtmlInputMaxLengthIgnoredForType,
  minLength: DiagnosticCode.HtmlInputMinLengthIgnoredForType,
  pattern: DiagnosticCode.HtmlInputPatternIgnoredForType,
  min: DiagnosticCode.HtmlInputMinIgnoredForType,
  max: DiagnosticCode.HtmlInputMaxIgnoredForType,
  step: DiagnosticCode.HtmlInputStepIgnoredForType,
  accept: DiagnosticCode.HtmlInputAcceptIgnoredForType,
  capture: DiagnosticCode.HtmlInputCaptureIgnoredForType,
  size: DiagnosticCode.HtmlInputSizeIgnoredForType,
  alt: DiagnosticCode.HtmlInputAltIgnoredForType,
  height: DiagnosticCode.HtmlInputHeightIgnoredForType,
  width: DiagnosticCode.HtmlInputWidthIgnoredForType,
}

export const HtmlDiagnostics = {
  emptyRole(tag: string): Fact {
    return {
      code: DiagnosticCode.HtmlEmptyRole,
      category: DiagnosticCategory.HTML,
      severity: 'warning',
      message: `<${tag}> has an explicit empty role="". Omit the attribute instead.`,
    }
  },

  implicitRoleRedundant(tag: string, implicitRole: string): Fact {
    return {
      code: DiagnosticCode.HtmlImplicitRoleRedundant,
      category: DiagnosticCategory.HTML,
      severity: 'warning',
      message: `<${tag}> already has implicit role="${implicitRole}". Avoid redundant role assignment.`,
    }
  },

  implicitRoleOverride(tag: string, implicitRole: string, role: string): Fact {
    return {
      code: DiagnosticCode.HtmlImplicitRoleOverride,
      category: DiagnosticCategory.HTML,
      severity: 'error',
      message: `<${tag}> should not override its implicit role="${implicitRole}" with role="${role}".`,
    }
  },

  standaloneRegionOverride(tag: string, implicitRole: string): Fact {
    return {
      code: DiagnosticCode.HtmlStandaloneRegionOverride,
      category: DiagnosticCategory.HTML,
      severity: 'error',
      message: `<${tag}> is a self-contained element with implicit role="${implicitRole}". Assigning role="region" has been removed.`,
    }
  },

  landmarkRoleOverride(tag: string, implicitRole: string, role: string): Fact {
    return {
      code: DiagnosticCode.HtmlLandmarkRoleOverride,
      category: DiagnosticCategory.HTML,
      severity: 'error',
      message: `<${tag}> has a fixed landmark role="${implicitRole}". role="${role}" overrides it and confuses assistive technology. The override has been removed.`,
    }
  },

  invalidChild(child: string, parent: string, allowed: string): Fact {
    return {
      code: DiagnosticCode.HtmlInvalidChild,
      category: DiagnosticCategory.HTML,
      severity: 'error',
      message: `<${child}> is not a valid direct child of <${parent}>. Allowed: ${allowed}.`,
    }
  },

  roleNotPermitted(tag: string, role: string, allowedRoles: readonly string[]): Fact {
    const allowed =
      allowedRoles.length > 0
        ? allowedRoles.map((r) => `"${r}"`).join(', ')
        : 'none — no explicit role is permitted on this element'
    return {
      code: DiagnosticCode.HtmlRoleNotPermitted,
      category: DiagnosticCategory.HTML,
      severity: 'error',
      message: `role="${role}" is not permitted on <${tag}>. Allowed alternate role(s): ${allowed}.`,
      rationale:
        'The WAI-ARIA "ARIA in HTML" specification restricts which explicit roles a native element may take. A role outside that set is ignored or produces undefined behavior in assistive technology.',
    }
  },

  // Reserved for <input>-specific facts (HTML3101–3199, see codes.ts) — later element families
  // (button, img, table, ...) get their own reserved block and their own namespace here.
  input: {
    unsupportedType(type: string): Fact {
      return {
        code: DiagnosticCode.HtmlInputUnsupportedType,
        category: DiagnosticCategory.HTML,
        severity: 'warning',
        message: `type="${type}" is not a value defined by the HTML specification. Browsers silently fall back to type="text".`,
        rationale:
          'An unrecognized input type is not invalid markup — the spec requires the "text" fallback — but it usually means a typo, since the input keeps working while silently losing the intended type-specific behavior (validation, virtual keyboard, picker UI).',
        suggestions: [
          {
            title: 'Check for a typo in the type value',
            description: `"${type}" does not match any HTML5 input type.`,
          },
        ],
      }
    },

    // The user-visible problem is that the attribute is ignored — not that it "requires" a type;
    // that's the rule's internal framing, not what the browser actually does.
    attributeIgnoredForType(
      attribute: string,
      type: string,
      allowedTypes: readonly string[],
    ): Fact {
      const allowed = allowedTypes.map((t) => `"${t}"`).join(', ')
      const code = ATTRIBUTE_IGNORED_CODES[attribute]
      if (!code) throw new Error(`No DiagnosticCode registered for input attribute "${attribute}"`)
      return {
        code,
        category: DiagnosticCategory.HTML,
        severity: 'warning',
        message: `"${attribute}" is ignored on <input type="${type}">.`,
        rationale: `"${attribute}" only has an effect when type is one of: ${allowed}. Browsers silently ignore it on other input types.`,
        suggestions: [
          {
            title: `Remove "${attribute}"`,
            description: `"${attribute}" only affects <input> when type is one of: ${allowed}.`,
          },
        ],
      }
    },
  },

  // Reserved for <a>-specific facts (HTML3201–3299, see codes.ts).
  anchor: {
    dangerousHref(href: string): Fact {
      return {
        code: DiagnosticCode.HtmlAnchorDangerousHref,
        category: DiagnosticCategory.HTML,
        severity: 'warning',
        message: `href="${href}" uses a scheme that executes attacker-controlled content when navigated to. It has been removed.`,
        rationale:
          '"javascript:", "data:", and "vbscript:" URLs are a common XSS vector when href comes from untrusted input — none of the three are needed for legitimate navigation.',
      }
    },
  },
}
