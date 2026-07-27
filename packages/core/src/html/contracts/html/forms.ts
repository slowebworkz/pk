import type { ChildRuleContext } from '@praxis-kit/primitive'
import { dynamic, getTag, isNumber, isString, isTag } from '@praxis-kit/primitive'
import {
  INTERACTIVE_CONTENT_TAGS,
  LABELABLE_TAGS,
  METADATA_TAGS,
  OTHER_INTERACTIVE_TAGS,
} from '../categories'
import { closedContract, contract, getChildProp, isOpenContent } from '../helpers'
import type { VNodeLike } from '../types'

/**
 * `<select>` — direct children must be `<option>`, `<optgroup>`, `<hr>`, `<script>`,
 * or `<template>`.
 */
export const selectContract = closedContract([
  { name: 'option', match: isTag('option', 'optgroup', 'hr', ...METADATA_TAGS) },
])

/**
 * `<optgroup>` — direct children must be `<option>`, `<script>`, or `<template>`.
 */
export const optgroupContract = closedContract([
  { name: 'option', match: isTag('option', ...METADATA_TAGS) },
])

/**
 * `<datalist>` — direct children must be `<option>`, `<script>`, or `<template>`.
 */
export const datalistContract = closedContract([
  { name: 'option', match: isTag('option', ...METADATA_TAGS) },
])

/**
 * `<button>` — must not directly contain interactive content (`<a>`, another `<button>`,
 * `<input>`, `<select>`, `<textarea>`, or `<label>`) per the HTML5 spec.
 */
export const buttonContract = closedContract([
  { name: 'content', match: isOpenContent(...INTERACTIVE_CONTENT_TAGS) },
])

/**
 * `<a>` — same interactive-content restriction as `<button>`: must not directly contain
 * `<a>`, `<button>`, `<input>`, `<select>`, `<textarea>`, or `<label>`.
 */
export const anchorContract = closedContract([
  { name: 'content', match: isOpenContent(...INTERACTIVE_CONTENT_TAGS) },
])

const labelableTagMatch = isTag(...LABELABLE_TAGS)

// Same tag set as `LABELABLE_TAGS`, but rejects `input[type="hidden"]`: a hidden input
// carries no visible control for a label's click-to-focus/accname association to target.
function isLabelableControl(child: unknown): child is VNodeLike {
  if (!labelableTagMatch(child)) return false
  if (getTag(child) !== 'input') return true
  const type = getChildProp(child, 'type')
  return !isString(type) || type !== 'hidden'
}

function hasAccessibleNameProp(props: Readonly<Record<string, unknown>>): boolean {
  return 'aria-label' in props || 'aria-labelledby' in props
}

// Matches a direct text/number child with visible content — whitespace-only text
// (common for JSX formatting, e.g. indentation between a label and its control)
// doesn't count as naming content.
function isNonEmptyTextChild(child: unknown): child is string | number {
  if (isNumber(child)) return true
  return isString(child) && child.trim().length > 0
}

/**
 * `<label>` — at most one labelable form control descendant (`<button>`, `<input>`
 * excluding `type="hidden"`, `<meter>`, `<output>`, `<progress>`, `<select>`, `<textarea>`);
 * a nested `<label>` is rejected outright, as is any other interactive content (`<a>`,
 * `<details>`, `<embed>`, `<iframe>`) that isn't the labeled control; any other phrasing
 * content is permitted. Requires an accessible name: either `aria-label`/`aria-labelledby`,
 * or visible (non-whitespace) text among its direct children.
 *
 * The text check only looks at direct children (matching every other rule in this
 * contract, and the engine's own model — it doesn't walk into a descendant control to
 * find, say, an `<option>`'s text), so a label whose only content is a nested element
 * with its own accessible name (e.g. `<label><input type="image" alt="Submit" /></label>`)
 * still reports as missing a name. That's a known, narrower check than the full HTML AAM
 * accessible-name computation, not a bug.
 */
export const labelContract = contract([
  { name: 'control', match: isLabelableControl, cardinality: { max: 1 } },
  { name: 'nested-label', match: isTag('label'), cardinality: { max: 0 } },
  {
    name: 'other-interactive-content',
    match: isTag(...OTHER_INTERACTIVE_TAGS),
    cardinality: { max: 0 },
  },
  {
    name: 'accessible-name',
    match: isNonEmptyTextChild,
    cardinality: dynamic((ctx: ChildRuleContext) =>
      hasAccessibleNameProp(ctx.props) ? { min: 0 } : { min: 1 },
    ),
  },
])
