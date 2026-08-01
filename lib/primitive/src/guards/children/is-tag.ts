import { isObject, isString, isNumber } from '../foundational'
import { COMPONENT_DEFAULT_TAG } from './component-id'

function getAsProp(child: unknown): string | undefined {
  if (!isObject(child) || !('props' in child)) return undefined
  const { props } = child
  if (!isObject(props)) return undefined
  const as = Reflect.get(props, 'as')
  return isString(as) && as !== '' ? as : undefined
}

/**
 * Resolves the effective HTML tag for a vnode:
 *   - native element: returns its type string directly
 *   - praxis-kit component: resolves `as ?? defaultTag`, mirroring render-time logic
 *   - anything else: returns undefined
 */
export function getTag(child: unknown): string | undefined {
  if (!isObject(child) || !('type' in child)) return undefined
  const { type: t } = child
  if (isString(t)) return t
  if (typeof t === 'function' || isObject(t)) {
    const defaultTag = Reflect.get(t, COMPONENT_DEFAULT_TAG)
    if (!isString(defaultTag)) return undefined
    return getAsProp(child) ?? defaultTag
  }
  return undefined
}

/**
 * Checks whether a vnode resolves to one of the given intrinsic tag names.
 * Matches native elements directly, and praxis-kit components by resolving
 * `as ?? defaultTag` — the same logic used at render time.
 *
 * Two call forms are supported:
 *   isTag('img')(child)        — curried, composable with Array#filter
 *   isTag(child, 'img')        — direct, reads naturally in if-blocks
 */
// Vnode shape proved by the predicate: has a type field (value unspecified —
// the resolved tag name, not the JS type, is what isTag() verifies).
export type TagChild = { type: unknown }

export function isTag(
  tag: string,
  ...tags: readonly string[]
): (child: unknown) => child is TagChild
export function isTag(child: unknown, tag: string, ...tags: readonly string[]): boolean
export function isTag(
  ...args: readonly unknown[]
): boolean | ((child: unknown) => child is TagChild) {
  if (isString(args[0])) {
    const set = new Set(args as string[])
    return (child: unknown): child is TagChild => {
      const tag = getTag(child)
      return tag !== undefined && set.has(tag)
    }
  }
  const [child, ...tags] = args
  const set = new Set(tags as string[])
  const tag = getTag(child)
  return tag !== undefined && set.has(tag)
}

/**
 * A vnode (or text node) that qualifies as flow content: text nodes
 * (string/number) always qualify, and elements/components qualify unless
 * their resolved tag is blocked — see `isFlowContent`.
 */
export type FlowContentChild = string | number | TagChild

/**
 * Checks whether a vnode is flow content per the HTML content model: text nodes
 * (string/number) always qualify, and elements/components qualify unless their
 * resolved tag is in the blocked set.
 *
 * Returns a type guard (not a plain boolean predicate) so it can be used
 * directly as a `ChildRuleInput.match`, which requires the narrowed type.
 */
export function isFlowContent(
  ...blockedTags: readonly string[]
): (child: unknown) => child is FlowContentChild {
  const set = new Set(blockedTags)
  return (child: unknown): child is FlowContentChild => {
    if (isString(child) || isNumber(child)) return true
    const tag = getTag(child)
    return tag === undefined || !set.has(tag)
  }
}
