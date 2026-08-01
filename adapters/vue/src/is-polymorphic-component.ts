import type { PolymorphicGenerics } from '@praxis-kit/core'
import { isObject, isString } from '@praxis-kit/primitive'
import type { PolymorphicComponent } from './types'

/**
 * Type guard narrowing a generated component's real (Vue-specific) object
 * shape down to the public `PolymorphicComponent<G>` interface the adapter
 * exposes.
 *
 * `defineComponent(...)` returns a plain object at runtime (not a class),
 * despite `PolymorphicComponent<G>` describing it with a `new()` construct
 * signature — that's purely a Volar/TSX type-checking convention and has no
 * runtime representation to check. The only thing this interface asserts
 * that's actually observable at runtime is "is an object" and an optional
 * `displayName` of the right kind.
 */
export function isPolymorphicComponent<G extends PolymorphicGenerics>(
  value: unknown,
): value is PolymorphicComponent<G> {
  if (!isObject(value)) return false
  if (!('displayName' in value)) return true
  return value.displayName === undefined || isString(value.displayName)
}
