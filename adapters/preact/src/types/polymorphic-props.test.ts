/**
 * Regression test mirroring React's `adapters/react/src/shared/types/polymorphic-props.test.ts` —
 * confirms `PolymorphicComponent<any>` stays assignable with `__generics` as an inline field, and
 * that `HasGenerics<G>` still recovers `G` correctly for Preact's own (3-overload, no `'render'`)
 * shape.
 */
import { describe, it, expectTypeOf } from 'vitest'
import type { HasGenerics } from '@praxis-kit/contract-props'
import type { DefaultOf, ElementType, EmptyRecord, PolymorphicGenerics } from '@praxis-kit/core'
import type {
  PolymorphicComponent,
  PolymorphicProps,
  PolymorphicWithAsChild,
} from './polymorphic-props'

type G = PolymorphicGenerics<'div', EmptyRecord, Readonly<EmptyRecord>>

/** Same overload shape as the real `PolymorphicComponent<G>`, but built via `HasGenerics<G> &
 *  { ... }` (an actual intersection) instead of an inline `__generics` field. */
type IntersectedComponent<TG extends PolymorphicGenerics> = HasGenerics<TG> & {
  <TAs extends ElementType = DefaultOf<TG>>(props: PolymorphicWithAsChild<TG, TAs>): unknown
  <TAs extends ElementType = DefaultOf<TG>>(props: PolymorphicProps<TG, TAs>): unknown
  (props: PolymorphicProps<TG, DefaultOf<TG>>): unknown
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- the point under test is PolymorphicComponent<any>
function accept(component: PolymorphicComponent<any>): void {
  void component
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- see accept() above
function acceptIntersected(component: IntersectedComponent<any>): void {
  void component
}

describe('PolymorphicComponent<any> assignability', () => {
  it('accepts a concrete PolymorphicComponent<G> — the real, inline-field design', () => {
    accept({} as PolymorphicComponent<G>)
  })

  it('would reject the same concrete component if the marker were intersected instead of inline', () => {
    // @ts-expect-error — this is exactly the failure `PolymorphicComponent` avoids by declaring
    // `__generics` inline rather than intersecting `HasGenerics<G>` onto the callable.
    acceptIntersected({} as IntersectedComponent<G>)
  })

  it('still recovers G through the real PolymorphicComponent via HasGenerics', () => {
    type Component = PolymorphicComponent<G>
    type Recovered = Component extends HasGenerics<infer TG> ? TG : never
    expectTypeOf<Recovered>().toEqualTypeOf<G>()
  })
})
