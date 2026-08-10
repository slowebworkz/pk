import type { AriaContext, AriaFix, AriaResult, AriaRole, AriaRule } from '../types'
import { HtmlDiagnostics } from '@praxis-kit/contract'
import type { StringMap } from '@praxis-kit/primitive'
import type { HtmlElementSpec } from './spec/types'
import { resolveAllowedRoles } from './spec/types'
import { inputElementSpec } from './spec/elements/input'
import { imgElementSpec } from './spec/elements/img'
import { tableElementSpec } from './spec/elements/table'

// The WAI-ARIA "ARIA in HTML" recommendation restricts which explicit `role` values a native
// element may take, beyond its own implicit role. `undefined` here means "not modeled" — either
// the element's allowed roles are context-dependent in a way a single-element `AriaContext` can't
// see (e.g. <td> becomes a valid `gridcell` only inside a `role="grid"` ancestor, which this
// tag-and-props-only context has no visibility into), or the allowed set isn't settled enough to
// enforce confidently. `[]` means the opposite extreme: no explicit role is permitted at all.
// This table should be cross-checked against the current W3C ARIA-in-HTML spec before being
// treated as exhaustive — it was authored from well-established fragments of that spec, not
// generated from it mechanically.
const ALLOWED_ROLES: Readonly<StringMap<readonly AriaRole[]>> = {
  article: ['application', 'document', 'feed', 'main', 'none', 'presentation', 'region'],
  aside: ['feed', 'none', 'presentation', 'region', 'search'],
  footer: ['group', 'none', 'presentation'],
  header: ['group', 'none', 'presentation'],
  main: [],
  nav: [],
  a: [
    'button',
    'checkbox',
    'menuitem',
    'menuitemcheckbox',
    'menuitemradio',
    'option',
    'radio',
    'switch',
    'tab',
    'treeitem',
  ],
  button: [
    'checkbox',
    'link',
    'menuitem',
    'menuitemcheckbox',
    'menuitemradio',
    'option',
    'radio',
    'switch',
    'tab',
  ],
  select: ['menu'],
  h1: ['tab', 'presentation', 'none'],
  h2: ['tab', 'presentation', 'none'],
  h3: ['tab', 'presentation', 'none'],
  h4: ['tab', 'presentation', 'none'],
  h5: ['tab', 'presentation', 'none'],
  h6: ['tab', 'presentation', 'none'],
  ul: [
    'directory',
    'group',
    'listbox',
    'menu',
    'menubar',
    'radiogroup',
    'tablist',
    'toolbar',
    'tree',
  ],
  ol: [
    'directory',
    'group',
    'listbox',
    'menu',
    'menubar',
    'radiogroup',
    'tablist',
    'toolbar',
    'tree',
  ],
  li: [
    'menuitem',
    'menuitemcheckbox',
    'menuitemradio',
    'option',
    'none',
    'presentation',
    'radio',
    'separator',
    'tab',
    'treeitem',
  ],
  dialog: ['alertdialog'],
  fieldset: ['none', 'presentation', 'radiogroup'],
  // `<label>` has no implicit role and no documented alternates — its native labeling
  // semantics (control association, accessible-name contribution) aren't reproducible via
  // ARIA, so any explicit `role` should be avoided rather than substituted.
  label: [],
}

// Tags whose allowed-roles fact is expressed as a spec/elements/*.ts `HtmlElementSpec` rather
// than a flat entry in `ALLOWED_ROLES` — currently the ones with prop-conditional or non-trivial
// policies. Tags not in this map fall back to the plain `ALLOWED_ROLES` lookup.
const ELEMENT_SPECS: Readonly<StringMap<HtmlElementSpec>> = {
  input: inputElementSpec,
  img: imgElementSpec,
  table: tableElementSpec,
}

function getAllowedRoles(
  tag: string,
  props: Readonly<StringMap<unknown>>,
): readonly AriaRole[] | undefined {
  const spec = ELEMENT_SPECS[tag]
  if (spec) return resolveAllowedRoles(spec, props)
  return ALLOWED_ROLES[tag]
}

const removeRoleFix: AriaFix = {
  kind: 'removeRole',
  apply: ({ props }) => {
    if (!('role' in props)) return { applied: false, next: props }
    const { role: _role, ...rest } = props
    return { applied: true, next: rest, previous: props }
  },
}

// Warn when an explicit `role` is neither the element's implicit role (that's the generic
// redundant-role check's job) nor one of its documented alternates.
export const roleNotPermittedRule: AriaRule = Object.assign(
  ({ tag, props, implicitRole }: AriaContext): readonly AriaResult[] => {
    const role = props.role
    if (typeof role !== 'string' || role.length === 0 || role === implicitRole) return []
    const allowed = getAllowedRoles(tag, props)
    if (allowed === undefined || allowed.includes(role)) return []
    const diagnostic = HtmlDiagnostics.roleNotPermitted(tag, role, allowed)
    return [
      {
        valid: false,
        fixable: true,
        severity: diagnostic.severity,
        fix: removeRoleFix,
        diagnostic,
      },
    ]
  },
  { readsProps: ['role', 'type', 'alt'] as const },
)
