import type { AriaContext, AriaFix, AriaResult, AriaRule } from '../types'
import type { HtmlTags } from './contracts/types'
import { AriaDiagnostics, HtmlDiagnostics } from '@praxis-kit/contract'
import { LANDMARK_TAGS } from './contracts/categories'
import { ANCHOR_RULES } from './anchor-rules'
import { INPUT_RULES } from './input-rules'
import { roleNotPermittedRule } from './role-restrictions'

// Attaches the `tags` an `AriaRule` applies to, so `AriaPolicyEngine` can skip calling it
// for any other tag instead of paying for a call it would just no-op on internally.
function defineAriaRule(
  tags: HtmlTags,
  rule: (context: AriaContext) => readonly AriaResult[],
): AriaRule {
  return Object.assign(rule, { tags })
}

// Typed as `ReadonlySet<string>`, not the narrower literal union `new Set(LANDMARK_TAGS)`
// would otherwise infer: `.has(tag)` below is checked against `AriaContext['tag']`
// (`IntrinsicTag`, every known HTML tag), which is wider than the landmark literals.
const LANDMARK_TAG_SET: ReadonlySet<string> = new Set(LANDMARK_TAGS)

const removeLandmarkRoleOverride: AriaFix = {
  kind: 'removeRole',
  apply: ({ props }) => {
    if (!('role' in props)) return { applied: false, next: props }
    const { role: _r, ...rest } = props
    return { applied: true, next: rest, previous: props }
  },
}

export const landmarkRoleRule = defineAriaRule(
  LANDMARK_TAGS,
  ({ tag, props, implicitRole }: AriaContext): readonly AriaResult[] => {
    if (!LANDMARK_TAG_SET.has(tag) || !implicitRole) return []
    const { role } = props
    // role === implicitRole is already caught by the built-in #checkRedundantRole (warns, removes).
    if (!role || role === implicitRole) return []
    const diagnostic = HtmlDiagnostics.landmarkRoleOverride(tag, implicitRole, role)
    return [
      {
        valid: false,
        fixable: true,
        severity: diagnostic.severity,
        fix: removeLandmarkRoleOverride,
        diagnostic,
      },
    ]
  },
)

// WAI-ARIA APG — elements that must have an accessible name to be usable by
// assistive technology. The check fires when neither aria-label nor aria-labelledby
// is present on the element.
// Reference: https://www.w3.org/WAI/ARIA/apg/practices/names-and-descriptions/
export function requireAccessibleName({ tag, props }: AriaContext): readonly AriaResult[] {
  if ('aria-label' in props || 'aria-labelledby' in props) return []
  return [
    {
      valid: false,
      fixable: false,
      severity: 'warning',
      diagnostic: AriaDiagnostics.missingAccessibleName(tag),
    },
  ]
}

// nav and aside are commonly multiplied on a single page (primary nav, breadcrumb nav;
// main content, sidebar) and each instance must have a unique accessible name so that
// screen reader users can distinguish them from the landmarks list.
// WAI-ARIA APG: https://www.w3.org/WAI/ARIA/apg/practices/landmark-regions/
const NAMED_LANDMARK_TAGS = ['nav', 'aside'] as const satisfies HtmlTags
const NAMED_LANDMARK_TAG_SET: ReadonlySet<string> = new Set(NAMED_LANDMARK_TAGS)

export const landmarkAccessibleNameRule = defineAriaRule(
  NAMED_LANDMARK_TAGS,
  (ctx: AriaContext): readonly AriaResult[] => {
    if (!ctx.implicitRole || !NAMED_LANDMARK_TAG_SET.has(ctx.tag)) return []
    return requireAccessibleName(ctx)
  },
)

export const HTML_ARIA_RULES: readonly AriaRule[] = [
  landmarkRoleRule,
  landmarkAccessibleNameRule,
  roleNotPermittedRule,
  ...INPUT_RULES,
  ...ANCHOR_RULES,
]
