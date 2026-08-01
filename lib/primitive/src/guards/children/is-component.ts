import { isObject, isString } from '../foundational'
import { COMPONENT_ID, createComponentId } from './component-id'
import type { RestrictedPropertyKey } from '../../types'

// After hasComponentId() / isComponent() succeeds the symbol is guaranteed present.
export type ComponentChild = {
  type: {
    [COMPONENT_ID]: symbol
  }
}

function isComponentId(value: unknown): value is RestrictedPropertyKey {
  return isString(value) || typeof value === 'symbol'
}

export function getComponentId(child: unknown): symbol | undefined {
  if (!isObject(child) || !('type' in child)) return undefined
  const { type } = child
  if (typeof type !== 'function' && !isObject(type)) return undefined
  const id = Reflect.get(type, COMPONENT_ID)
  return typeof id === 'symbol' ? id : undefined
}

export function hasComponentId(child: unknown): child is ComponentChild {
  return getComponentId(child) !== undefined
}

function createPredicate(
  ids: readonly RestrictedPropertyKey[],
): (child: unknown) => child is ComponentChild {
  const set = new Set(ids.map((id) => (isString(id) ? createComponentId(id) : id)))
  return (child): child is ComponentChild => {
    const id = getComponentId(child)
    return id !== undefined && set.has(id)
  }
}

/**
 * Returns a predicate that matches vnodes for praxis-kit components with any of
 * the given identifiers. Each identifier is either:
 *   - a string: resolved to Symbol.for(`praxis.component.${name}`) — matches
 *     components created with that name via createContractComponent
 *   - a symbol: matched directly against the component's COMPONENT_ID value —
 *     useful for custom stable IDs (e.g. Symbol.for('praxis.image'))
 *
 * HOC wrappers (memo, forwardRef, etc.) must explicitly propagate the ID:
 *   Wrapped[COMPONENT_ID] = Original[COMPONENT_ID]
 *
 * Two call forms are supported:
 *   isComponent('Image')(child)        — curried, composable with Array#filter
 *   isComponent(child, 'Image')        — direct, reads naturally in if-blocks
 */
export function isComponent(
  id: RestrictedPropertyKey,
  ...ids: readonly RestrictedPropertyKey[]
): (child: unknown) => child is ComponentChild
export function isComponent(
  child: unknown,
  id: RestrictedPropertyKey,
  ...ids: readonly RestrictedPropertyKey[]
): child is ComponentChild
export function isComponent(...args: readonly unknown[]) {
  if (isComponentId(args[0])) {
    return createPredicate(args as RestrictedPropertyKey[])
  }
  const [child, ...ids] = args
  return createPredicate(ids as RestrictedPropertyKey[])(child)
}
