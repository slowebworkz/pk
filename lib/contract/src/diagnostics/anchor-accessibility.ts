import type { DiagnosticInput } from '@praxis-kit/diagnostics'
import { DiagnosticCategory, DiagnosticCode } from '@praxis-kit/diagnostics'
import type { Severity as AriaSeverity } from '@praxis-kit/primitive'

// See `html.ts`'s `Fact` for why severity lives on the diagnostic rather than at each rule's call
// site.
type AccessibilityDiagnostic = DiagnosticInput & { readonly severity: AriaSeverity }

function createDiagnostic(
  input: Omit<AccessibilityDiagnostic, 'category'>,
): AccessibilityDiagnostic {
  return { category: DiagnosticCategory.Accessibility, ...input }
}

// Accessibility best-practice advisories for <a>. These patterns are permitted by the HTML/ARIA
// specifications but are discouraged by the WAI-ARIA Authoring Practices because they weaken or
// obscure an anchor's navigation semantics. Distinct from `HtmlDiagnostics.anchor`, which covers
// HTML validity/security facts.
export const AnchorAccessibilityDiagnostics = {
  roleButtonWithHref(): AccessibilityDiagnostic {
    return createDiagnostic({
      code: DiagnosticCode.A11yAnchorRoleButtonWithHref,
      severity: 'warning',
      message:
        'role="button" on an <a> with an href overrides its navigation semantics for assistive technology; use a real <button> element, or remove href, if this element should not navigate.',
      rationale:
        'Assistive technology announces role="button" as a button, not a link — but the element still follows the link when activated by mouse or keyboard, which is confusing and inconsistent with how a button is expected to behave.',
      suggestions: [
        {
          title: 'Use a real <button>',
          description: 'If this element should not navigate, render a <button> instead of an <a>.',
        },
        {
          title: 'Remove role="button"',
          description: 'If this element should navigate, keep the default link role.',
        },
      ],
    })
  },

  ariaDisabledInert(): AccessibilityDiagnostic {
    return createDiagnostic({
      code: DiagnosticCode.A11yAnchorAriaDisabledInert,
      severity: 'warning',
      message:
        'aria-disabled does not prevent an <a> from being focused, clicked, or navigated via keyboard; remove href, or prevent navigation yourself, if this link should be inert.',
      rationale:
        'Unlike a native form control, an <a> has no disabled state the browser enforces — aria-disabled only changes what assistive technology announces, not what actually happens when the link is activated by mouse or keyboard.',
      suggestions: [
        {
          title: 'Remove href',
          description:
            'If this element is temporarily unavailable, remove href until it can be activated.',
        },
        {
          title: 'Prevent navigation when disabled',
          description:
            'Prevent the click and keyboard activation when the link is disabled so it behaves consistently for all users.',
        },
      ],
    })
  },
}
