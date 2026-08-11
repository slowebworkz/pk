import { describe, it, expectTypeOf } from 'vitest'
import type { HasGenerics } from './has-generics'

/** Minimal stand-in for `PolymorphicGenerics` — this package doesn't depend on
 *  `@praxis-kit/core`, so the test mocks just enough shape to exercise `HasGenerics<G>`. */
interface MockGenerics<TDefault, Props> {
  default: TDefault
  props: Props
}

/**
 * Mirrors the actual shape `HasGenerics<G>` exists to support: an overloaded callable with
 * several generic call signatures plus a non-generic fallback anchored to a default shape — the
 * same structure as React/Preact's `PolymorphicComponent<G>`, where `ComponentProps<typeof X>`-
 * style extraction only ever resolves against the last (fallback) signature, making `G` otherwise
 * unrecoverable for the other signatures.
 */
type OverloadedComponent<G extends MockGenerics<unknown, unknown>> = {
  (props: { asChild: true } & G['props']): void
  (props: { asChild?: false } & G['props']): void // non-generic fallback, mirrors ComponentProps<T>
}

type ExtractGenerics<T extends HasGenerics<unknown>> = T extends HasGenerics<infer G> ? G : never

describe('HasGenerics against an overloaded callable', () => {
  it('recovers G through an intersection with multiple call signatures + a non-generic fallback', () => {
    type G = MockGenerics<'div', { foo: string }>
    type Component = HasGenerics<G> & OverloadedComponent<G>

    type Recovered = ExtractGenerics<Component>

    expectTypeOf<Recovered>().toEqualTypeOf<G>()
  })
})
