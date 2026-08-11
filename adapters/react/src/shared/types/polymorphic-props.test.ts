/**
 * Regression test for a real, discovered TypeScript limitation (not a hypothetical): a build of
 * this file that instead wrote `PolymorphicComponent<G> = HasGenerics<G> & { ...call
 * signatures... }` (an actual intersection) broke assignability once `PolymorphicComponent<any>`
 * was involved — the shape test helpers like `shared/test-utils.ts`'s `box(component:
 * PolymorphicComponent<any>)` use to accept *any* concrete built component. Not reproducible in
 * an isolated minimal mock (see `lib/contract-props/src/has-generics.test.ts`) — this test uses
 * the real `PolymorphicComponent<G>` and its real overload set directly, which is why it lives
 * here rather than in the framework-agnostic `@praxis-kit/contract-props` package.
 */
import { describe, it, expectTypeOf } from 'vitest'
import type { HasGenerics } from '@praxis-kit/contract-props'
import type { DefaultOf, ElementType, EmptyRecord, PolymorphicGenerics } from '@praxis-kit/core'
import type {
  PolymorphicComponent,
  PolymorphicProps,
  PolymorphicWithAsChild,
  PolymorphicWithRender,
} from './polymorphic-props'

type G = PolymorphicGenerics<'div', EmptyRecord, Readonly<EmptyRecord>>

/** The same overload shape as the real `PolymorphicComponent<G>`, but built via `HasGenerics<G> &
 *  { ... }` (an actual intersection) instead of an inline `__generics` field — the alternative
 *  design this file's own doc comment on `PolymorphicComponent` rejects. */
type IntersectedComponent<TG extends PolymorphicGenerics> = HasGenerics<TG> & {
  <TAs extends ElementType = DefaultOf<TG>>(props: PolymorphicWithRender<TG, TAs>): unknown
  <TAs extends ElementType = DefaultOf<TG>>(props: PolymorphicWithAsChild<TG, TAs>): unknown
  <TAs extends ElementType = DefaultOf<TG>>(props: PolymorphicProps<TG, TAs>): unknown
  (props: PolymorphicProps<TG, DefaultOf<TG>>): unknown
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- the point under test is PolymorphicComponent<any>, same precedent as shared/test-utils.ts's box()
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
