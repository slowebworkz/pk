import { describe, expect, it, vi } from 'vitest'

import { createObservable } from './create-observable'

describe('createObservable', () => {
  it('get() returns the initial value', () => {
    const observable = createObservable(1)
    expect(observable.get()).toBe(1)
  })

  it('set() updates the value read by get()', () => {
    const observable = createObservable(1)
    observable.set(2)
    expect(observable.get()).toBe(2)
  })

  it('set() notifies subscribers on a changed value', () => {
    const observable = createObservable(1)
    const listener = vi.fn()
    observable.subscribe(listener)
    observable.set(2)
    expect(listener).toHaveBeenCalledTimes(1)
  })

  it('set() does not notify when the value is Object.is-equal to the current one', () => {
    const observable = createObservable(1)
    const listener = vi.fn()
    observable.subscribe(listener)
    observable.set(1)
    expect(listener).not.toHaveBeenCalled()
  })

  it('subscribe() returns an unsubscribe function that stops future notifications', () => {
    const observable = createObservable(1)
    const listener = vi.fn()
    const unsubscribe = observable.subscribe(listener)
    unsubscribe()
    observable.set(2)
    expect(listener).not.toHaveBeenCalled()
  })

  it('notifies every subscriber, in registration order', () => {
    const observable = createObservable(1)
    const calls: string[] = []
    observable.subscribe(() => calls.push('a'))
    observable.subscribe(() => calls.push('b'))
    observable.set(2)
    expect(calls).toEqual(['a', 'b'])
  })
})
