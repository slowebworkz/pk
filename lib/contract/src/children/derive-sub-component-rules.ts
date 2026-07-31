import type { ChildRuleInput, SubComponentMap } from '@praxis-kit/primitive'
import { isObject } from '@praxis-kit/primitive'

/**
 * Returns the framework-specific component type associated with a rendered
 * child.
 *
 * Supports any framework that exposes a `type` property on its rendered
 * node representation, such as React elements and Vue vnodes.
 */
function getComponentType(child: unknown): unknown | undefined {
  if (!isObject(child) || !('type' in child)) return undefined
  return child.type
}

/**
 * True when `type` is a custom-element constructor (Lit/web adapters) — a
 * class extending `HTMLElement`, rather than a vnode-style component
 * reference.
 */
function isCustomElementConstructor(type: unknown): type is new (...args: never[]) => HTMLElement {
  return (
    typeof type === 'function' &&
    typeof HTMLElement !== 'undefined' &&
    type.prototype instanceof HTMLElement
  )
}

/**
 * Matches a rendered child against a sub-component reference.
 *
 * Vnode-style frameworks (React, Vue) expose the component reference via a
 * `.type` property on the rendered node — matched by identity. Custom
 * elements (Lit, web) render as plain DOM nodes with no such property —
 * matched by `instanceof` against the registered element class instead.
 */
function matchesSubComponent(child: unknown, type: unknown): boolean {
  if (isCustomElementConstructor(type)) {
    return typeof Node !== 'undefined' && child instanceof Node && child instanceof type
  }
  return getComponentType(child) === type
}

/**
 * Derives child enforcement rules from a compound component's
 * sub-components by matching component identity.
 *
 * Each generated rule matches children by component identity rather than
 * rendered tag name, ensuring the child contract stays synchronized with
 * the compound component API without requiring duplicate configuration.
 *
 * Generated rules intentionally leave `cardinality` unspecified so callers
 * may define their own multiplicity constraints.
 */
export function deriveSubComponentRules(subComponents: SubComponentMap): ChildRuleInput[] {
  return Object.entries(subComponents).map(([name, type]) => {
    const rule: ChildRuleInput = {
      name,
      match: (child: unknown): child is unknown => matchesSubComponent(child, type),
    }

    // Only attach `type` for the O(1) type-dispatch fast path (rules-matcher.ts)
    // when children actually carry a `.type` property to index on. Custom-element
    // children are plain DOM nodes with no such property — indexing by `type`
    // here would route them into the fast path and they'd never be looked up,
    // silently defeating `match` above (rules-matcher.ts's typed rules are
    // dispatched via child.type, never via match(), once type is set).
    if (!isCustomElementConstructor(type)) {
      rule.type = type
    }

    return rule
  })
}
