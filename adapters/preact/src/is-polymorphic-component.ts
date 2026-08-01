import type { PolymorphicGenerics } from '@praxis-kit/core'
import { isFunction, isString } from '@praxis-kit/primitive'
import type { PolymorphicComponent } from './types'

/**
 * Type guard narrowing a generated component's real (Preact-specific)
 * function type down to the public `PolymorphicComponent<G>` interface the
 * adapter exposes.
 *
 * `PolymorphicComponent<G>`'s call signatures reference `G`, which is
 * erased at runtime, so no guard can check them — the only thing this
 * interface asserts that's actually observable at runtime is "callable" and
 * an optional `displayName` of the right kind. `forwardRef`'s return value
 * is a plain function (with extra properties stamped on it), so `isFunction`
 * is the correct check here.
 */
export function isPolymorphicComponent<G extends PolymorphicGenerics>(
  value: unknown,
): value is PolymorphicComponent<G> {
  if (!isFunction(value)) return false
  if (!('displayName' in value)) return true
  return value.displayName === undefined || isString(value.displayName)
}
