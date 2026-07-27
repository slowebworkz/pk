import { isFunction, isObject } from '../foundational'
import type { WithComponentMetadata } from '../../types/guards/with-component-id'

/**
 * Well-known Symbol stamped onto every component created by praxis-kit factories.
 * The value stored at this key is a unique Symbol via Symbol.for(), scoped to the
 * component name. HOC wrappers (memo, forwardRef, styled, etc.) must propagate it
 * explicitly: `Wrapped[COMPONENT_ID] = Original[COMPONENT_ID]`.
 */
export const COMPONENT_ID: unique symbol = Symbol.for('praxis.component-id')

/**
 * Well-known Symbol stamped onto every component created by praxis-kit factories.
 * Stores the factory's defaultTag — the tag that renders when no `as` prop is given.
 * HOC wrappers must propagate it: `Wrapped[COMPONENT_DEFAULT_TAG] = Original[COMPONENT_DEFAULT_TAG]`.
 */
export const COMPONENT_DEFAULT_TAG: unique symbol = Symbol.for('praxis.component-default-tag')

export type WithComponentId = WithComponentMetadata<
  typeof COMPONENT_ID,
  typeof COMPONENT_DEFAULT_TAG
>

// Derived from WithComponentId's own keys rather than hand-duplicated, so adding a
// third metadata symbol to the generic instantiation above is the only edit needed —
// defineComponentMetadata's key cast below stays correct automatically.
type ComponentMetadataKey = keyof WithComponentId

/**
 * Returns the well-known Symbol for a component created with the given name.
 * Centralises the `Symbol.for('praxis.component.${name}')` convention so callers
 * don't have to know the key format.
 */
export function createComponentId(name: string): symbol {
  return Symbol.for(`praxis.component.${name}`)
}

function isMarkable(value: unknown): value is object {
  return isFunction(value) || isObject(value)
}

/**
 * Stamps one or more `WithComponentId` keys onto a component function/object as
 * non-writable, non-enumerable properties — accidental plain-assignment overwrite
 * (`Wrapped[COMPONENT_DEFAULT_TAG] = 'div'` clobbering an already-stamped value) is
 * rejected, but `configurable: true` keeps it re-stampable through this same helper
 * (e.g. a component factory re-running in dev/HMR), rather than throwing outright.
 * Single choke point every `mark*` helper below funnels through, so future metadata
 * keys only need a property list here, not a new stamping mechanism.
 */
function defineComponentMetadata<T extends object>(component: T, metadata: WithComponentId): T {
  for (const key of Object.getOwnPropertySymbols(metadata) as ComponentMetadataKey[]) {
    Object.defineProperty(component, key, {
      value: metadata[key],
      writable: false,
      configurable: true,
      enumerable: false,
    })
  }
  return component
}

/**
 * Stamps `COMPONENT_DEFAULT_TAG` onto a component function/object, so `isTag()`
 * (and every built-in/custom `enforcement.children` rule built on it) resolves it
 * to `tag` — the same recognition a component created via `createContractComponent`
 * gets automatically. A transparent wrapper around a praxis-kit component (added
 * purely to narrow prop types, for example) is a *different* function object with
 * no `COMPONENT_DEFAULT_TAG` of its own, so without this it silently stops being
 * recognized as a valid child by every parent contract. Returns `component` for
 * call-site chaining, e.g. `export const Wrapped = markComponentTag(WrapperFn, 'source')`.
 */
export function markComponentTag<T extends object>(component: T, tag: string): T {
  return defineComponentMetadata(component, { [COMPONENT_DEFAULT_TAG]: tag })
}

/** Reads `COMPONENT_DEFAULT_TAG` off a component function/object, if present. */
export function getComponentDefaultTag(component: unknown): string | undefined {
  if (!isMarkable(component)) return undefined
  const tag = (component as WithComponentId)[COMPONENT_DEFAULT_TAG]
  return typeof tag === 'string' ? tag : undefined
}
