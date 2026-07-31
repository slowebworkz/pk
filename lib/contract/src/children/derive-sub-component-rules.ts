import type { ChildRuleInput, SubComponentMap } from '@praxis-kit/primitive'
import { isObject } from '@praxis-kit/primitive'

/**
 * Returns the framework-specific component type associated with a rendered
 * child.
 *
 * Supports any framework that exposes a `type` property on its rendered
 * node representation, such as React elements and Vue VNodes.
 */
function getComponentType(child: unknown): unknown | undefined {
  if (!isObject(child) || !('type' in child)) return undefined
  return child.type
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
  return Object.entries(subComponents).map(([name, type]) => ({
    name,
    type,
    match: (child: unknown): child is unknown => getComponentType(child) === type,
  }))
}
