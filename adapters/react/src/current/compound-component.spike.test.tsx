/**
 * Proves the `subComponents` compound-component mechanism end-to-end in
 * React: typed compound output, derived `enforcement.children` catching
 * drift between the attached sub-components and the children contract, and
 * non-regression for plain (non-compound) usage.
 */
import { describe, it, expect, expectTypeOf } from 'vitest'
import { createElement } from 'react'
import type { EmptyRecord, PolymorphicGenerics } from '@praxis-kit/core'
import { box, useReactDom } from '../shared/test-utils'
import type { PolymorphicComponent } from '../shared'
import { createContractComponent } from './create-contract-component'

const dom = useReactDom()

describe('subComponents (compound component generation spike)', () => {
  const Header = createContractComponent({ tag: 'header' as const, name: 'CardHeader' })
  const Content = createContractComponent({ tag: 'div' as const, name: 'CardContent' })
  const Footer = createContractComponent({ tag: 'footer' as const, name: 'CardFooter' })

  const Card = createContractComponent({
    tag: 'section' as const,
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

  it('ComponentProps-style call-signature extraction still resolves the root’s own props, unaffected by the sub-component intersection', () => {
    type RootProps = Parameters<typeof Card>[0]
    expectTypeOf<RootProps>().toMatchTypeOf<{ as?: unknown }>()
  })

  it('renders the assembled sub-components as ordinary children', () => {
    dom.mount(
      createElement(
        box(Card),
        null,
        createElement(box(Card.Header), { key: 'h' }),
        createElement(box(Card.Content), { key: 'c' }),
        createElement(box(Card.Footer), { key: 'f' }),
      ),
    )
    const section = dom.container.querySelector('section')!
    expect(section.querySelector('header')).toBeTruthy()
    expect(section.querySelector('footer')).toBeTruthy()
  })

  it('derives enforcement.children from subComponents and rejects an unlisted child', () => {
    // exclusiveChildren: true makes the derived rule set a closed content
    // model — without it, enforcement.children only describes the *named*
    // children, it doesn't reject everything else (matches
    // packages/core/src/html/contracts/helpers.ts's contract() vs
    // closedContract() distinction). subComponents intentionally leaves
    // this opt-in rather than implying a closed model, so callers can still
    // slot in arbitrary children alongside the named sub-components.
    const Stray = createContractComponent({ tag: 'aside' as const, name: 'Stray' })
    const ClosedCard = createContractComponent({
      tag: 'section' as const,
      name: 'ClosedCard',
      subComponents: { Header, Content, Footer },
      enforcement: { exclusiveChildren: true },
    })

    expect(() =>
      dom.mount(
        createElement(
          box(ClosedCard),
          null,
          createElement(box(ClosedCard.Header), { key: 'h' }),
          createElement(box(Stray), { key: 's' }),
        ),
      ),
    ).toThrow(/unexpected child/)
  })

  it('a plain (non-compound) component is unaffected — no subComponents option, no drift-checking behavior', () => {
    const Plain = createContractComponent({ tag: 'div' as const, name: 'Plain' })
    type Expected = PolymorphicComponent<
      PolymorphicGenerics<'div', EmptyRecord, Readonly<EmptyRecord>>
    > &
      EmptyRecord
    expectTypeOf(Plain).toEqualTypeOf({} as Expected)

    expect(() =>
      dom.mount(createElement(box(Plain), null, createElement('span', { key: 'x' }))),
    ).not.toThrow()
  })
})
