/**
 * Proves the `subComponents` compound-component mechanism end-to-end in
 * Vue: typed compound output, derived `enforcement.children` catching
 * drift between the attached sub-components and the children contract, and
 * non-regression for plain (non-compound) usage. Mirrors
 * `adapters/react/src/current/compound-component.spike.test.tsx` — same
 * assertions, proving the framework-neutral core behaves identically here.
 */
import { describe, it, expect, expectTypeOf } from 'vitest'
import { mount } from '@vue/test-utils'
import { h } from 'vue'
import type { EmptyRecord, PolymorphicGenerics } from '@praxis-kit/core'
import type { PolymorphicComponent } from './types'
import { createContractComponent } from './create-contract-component'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function box(comp: unknown): any {
  return comp
}

describe('subComponents (compound component generation spike)', () => {
  const Header = createContractComponent({ tag: 'header', name: 'CardHeader' })
  const Content = createContractComponent({ tag: 'div', name: 'CardContent' })
  const Footer = createContractComponent({ tag: 'footer', name: 'CardFooter' })

  const Card = createContractComponent({
    tag: 'section',
    name: 'Card',
    subComponents: { Header, Content, Footer },
  })

  it('assembles the sub-components onto the root, like Object.assign would', () => {
    expect(Card.Header).toBe(Header)
    expect(Card.Content).toBe(Content)
    expect(Card.Footer).toBe(Footer)
  })

  it('has the correct compile-time type for each sub-component', () => {
    expectTypeOf(Card.Header).toEqualTypeOf(Header)
    expectTypeOf(Card.Content).toEqualTypeOf(Content)
    expectTypeOf(Card.Footer).toEqualTypeOf(Footer)
  })

  it('renders the assembled sub-components as ordinary children', () => {
    const wrapper = mount(box(Card), {
      slots: {
        default: () => [h(box(Card.Header)), h(box(Card.Content)), h(box(Card.Footer))],
      },
    })
    expect(wrapper.element.querySelector('header')).toBeTruthy()
    expect(wrapper.element.querySelector('footer')).toBeTruthy()
  })

  it('derives enforcement.children from subComponents and rejects an unlisted child', () => {
    // exclusiveChildren: true makes the derived rule set a closed content
    // model — without it, enforcement.children only describes the *named*
    // children, it doesn't reject everything else (matches
    // packages/core/src/html/contracts/helpers.ts's contract() vs
    // closedContract() distinction). subComponents intentionally leaves
    // this opt-in rather than implying a closed model, so callers can still
    // slot in arbitrary children alongside the named sub-components.
    const Stray = createContractComponent({ tag: 'aside', name: 'Stray' })
    const ClosedCard = createContractComponent({
      tag: 'section',
      name: 'ClosedCard',
      subComponents: { Header, Content, Footer },
      enforcement: { exclusiveChildren: true },
    })

    expect(() =>
      mount(box(ClosedCard), {
        slots: {
          default: () => [h(box(ClosedCard.Header)), h(box(Stray))],
        },
      }),
    ).toThrow(/unexpected child/)
  })

  it('a plain (non-compound) component is unaffected — no subComponents option, no drift-checking behavior', () => {
    const Plain = createContractComponent({ tag: 'div', name: 'Plain' })
    type Expected = PolymorphicComponent<
      PolymorphicGenerics<'div', EmptyRecord, Readonly<EmptyRecord>>
    > &
      EmptyRecord
    expectTypeOf(Plain).toEqualTypeOf({} as Expected)

    expect(() => mount(box(Plain), { slots: { default: () => [h('span')] } })).not.toThrow()
  })
})
