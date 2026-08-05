export interface Observable<T> {
  /** Current value. */
  get(): T
  /** Sets a new value and notifies subscribers — a no-op if `Object.is`-equal to the current one. */
  set(value: T): void
  /** Registers a listener, called on every `set()` that actually changes the value. Returns an unsubscribe function. */
  subscribe(listener: () => void): () => void
}

/**
 * A minimal observable value: `get`/`set`/`subscribe`, diffing on `set` so unchanged values don't
 * notify. Shaped to match React's `useSyncExternalStore(subscribe, getSnapshot)` contract, but not
 * React-specific — any adapter can call `subscribe` from its own reactivity primitive (Vue's
 * `watchEffect`, Solid's `createSignal` glue, or a vanilla consumer calling it directly).
 *
 * Consolidates the `#listeners = new Set<Listener>()` + diff-and-notify bookkeeping that a
 * stateful `onElement`-based controller (see `FactoryOptions.onElement`) would otherwise
 * hand-roll from scratch for every component that needs one.
 */
export function createObservable<T>(initial: T): Observable<T> {
  let value = initial
  const listeners = new Set<() => void>()

  return {
    get: () => value,
    set: (next) => {
      if (Object.is(next, value)) return
      value = next
      listeners.forEach((listener) => listener())
    },
    subscribe: (listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
  }
}
