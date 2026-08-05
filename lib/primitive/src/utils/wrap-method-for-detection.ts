/** A method of arbitrary signature — callers supply the concrete element type. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- see above
type AnyMethod = (...args: any[]) => any

export interface WrappedMethod<Fn extends AnyMethod> {
  /**
   * Calls the original method directly, without triggering `onExternalCall` — for a controller's
   * own internal resyncs, so they don't announce themselves as if the consumer had called the
   * native method directly.
   */
  readonly callSilently: Fn
  /** Removes the wrapper, restoring the element's own method. */
  readonly restore: () => void
}

/**
 * Wraps `element[methodName]` so calling it also invokes `onExternalCall` — for native methods
 * with no matching native event (`dialogEl.showModal()` has no "opened" event to listen for
 * instead). Returns the original method (safe to call without re-triggering detection) and a
 * `restore()` to remove the wrapper.
 *
 * Consolidates a pattern an `onElement`-based controller (see `FactoryOptions.onElement`) would
 * otherwise hand-roll per component: capturing the original bound method, replacing it on the
 * instance, and stashing the original somewhere the controller's own code can still reach it
 * without re-announcing itself as an external call.
 */
export function wrapMethodForDetection<El extends Record<K, AnyMethod>, K extends PropertyKey>(
  element: El,
  methodName: K,
  onExternalCall: (...args: Parameters<El[K]>) => void,
): WrappedMethod<El[K]> {
  const original = element[methodName].bind(element) as El[K]

  Object.defineProperty(element, methodName, {
    value: (...args: Parameters<El[K]>) => {
      const result = original(...args)
      onExternalCall(...args)
      return result
    },
    configurable: true,
    writable: true,
  })

  return {
    callSilently: original,
    restore: () => {
      // Removing the instance-own override falls back to the prototype's real implementation —
      // the common case, since `methodName` is almost always a prototype method being detected,
      // not an existing instance override.
      delete (element as Record<PropertyKey, unknown>)[methodName]
    },
  }
}
