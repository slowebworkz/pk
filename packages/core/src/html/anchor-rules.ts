import type { AriaContext, AriaResult, AriaRule } from '../types'
import {
  AnchorAccessibilityDiagnostics,
  HtmlDiagnostics,
  createRemoveAttributeRule,
  invalidWithoutFix,
} from '@praxis-kit/contract'
import { isString } from '@praxis-kit/primitive'

// URI schemes that execute or render attacker-controlled content when navigated to — the classic
// anchor-tag XSS vector. `data:` is included because `data:text/html` opens attacker-controlled
// markup (and can run script) in the current browsing context, not just images/fonts.
const DANGEROUS_URL_SCHEMES: readonly string[] = ['javascript:', 'data:', 'vbscript:']

// Strips ASCII whitespace and control characters before scheme-matching. Browsers ignore these
// characters anywhere in a URL when scheme-sniffing, so `java\tscript:` and `java\nscript:` both
// still execute — a bare case-insensitive prefix check alone is bypassable.
function normalizeForSchemeCheck(href: string): string {
  // eslint-disable-next-line no-control-regex
  return href.replace(/[\x00-\x20]/g, '').toLowerCase()
}

function isDangerousUrl(href: unknown): href is string {
  if (!isString(href)) return false
  const normalized = normalizeForSchemeCheck(href)
  return DANGEROUS_URL_SCHEMES.some((scheme) => normalized.startsWith(scheme))
}

// ─── Layer 1: HTML/security validity facts ─────────────────────────────────────────────────────

export const dangerousHrefRule: AriaRule = createRemoveAttributeRule('href', {
  when: ({ props }) => isDangerousUrl(props.href),
  severity: 'warning',
  diagnostic: ({ props }) => HtmlDiagnostics.anchor.dangerousHref(props.href as string),
  readsProps: ['href'],
  tags: ['a'],
})

// ─── Layer 2: accessibility best practices (legal HTML, still worth flagging) ────────────────

export const roleButtonWithHrefRule: AriaRule = Object.assign(
  ({ props }: AriaContext): readonly AriaResult[] => {
    if (props.role !== 'button' || !isString(props.href) || props.href.length === 0) {
      return []
    }
    const diagnostic = AnchorAccessibilityDiagnostics.roleButtonWithHref()
    return [invalidWithoutFix({ severity: diagnostic.severity, attribute: 'role', diagnostic })]
  },
  { readsProps: ['role', 'href'] as const, tags: ['a'] as const },
)

export const ariaDisabledInertRule: AriaRule = Object.assign(
  ({ props }: AriaContext): readonly AriaResult[] => {
    const ariaDisabled = props['aria-disabled']
    const isDisabled = ariaDisabled === true || ariaDisabled === 'true'
    // Without an href the anchor is already inert — aria-disabled has nothing to fail to
    // prevent, so the warning would be describing a non-problem.
    const hasHref = isString(props.href) && props.href.length > 0
    if (!isDisabled || !hasHref) return []
    const diagnostic = AnchorAccessibilityDiagnostics.ariaDisabledInert()
    return [
      invalidWithoutFix({ severity: diagnostic.severity, attribute: 'aria-disabled', diagnostic }),
    ]
  },
  { readsProps: ['aria-disabled', 'href'] as const, tags: ['a'] as const },
)

// Not "ARIA rules" — the first is an HTML/security validity fact, the second two are
// accessibility best-practice advisories. Neither is ARIA-specific. Mirrors INPUT_RULES.
export const ANCHOR_RULES: readonly AriaRule[] = [
  dangerousHrefRule,
  roleButtonWithHrefRule,
  ariaDisabledInertRule,
]
