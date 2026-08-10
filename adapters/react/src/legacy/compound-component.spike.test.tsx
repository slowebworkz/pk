// @vitest-environment jsdom
/**
 * Proves the `subComponents` compound-component mechanism end-to-end in the React 18 (legacy,
 * forwardRef) adapter — mirrors ../current/compound-component.spike.test.tsx: typed compound
 * output, ref forwarding still working alongside subComponents, rendering the attached
 * sub-components as ordinary children, and non-regression for plain (non-compound) usage.
 */
import { describe, it, expect, expectTypeOf } from 'vitest'
import { createElement, createRef } from 'react'
import type { EmptyRecord, PolymorphicGenerics } from '@praxis-kit/core'
import { box, useReactDom } from '../shared/test-utils'
import type { PolymorphicComponent } from '../shared'
import { createContractComponent } from './create-contract-component'

const dom = useReactDom()

describe('subComponents (compound component generation spike, legacy)', () => {
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

  it('ref forwarding still works alongside subComponents — this adapter is forwardRef-based', () => {
    const ref = createRef<HTMLElement>()
    dom.mount(createElement(box(Card), { ref }))
    expect(ref.current).toBeInstanceOf(HTMLElement)
    expect(ref.current?.tagName.toLowerCase()).toBe('section')
  })

  it('a plain (non-compound) component is unaffected — no subComponents option', () => {
    const Plain = createContractComponent({ tag: 'div' as const, name: 'Plain' })
    type Expected = PolymorphicComponent<
      PolymorphicGenerics<'div', EmptyRecord, Readonly<EmptyRecord>>
    >
    expectTypeOf(Plain).toEqualTypeOf({} as Expected)

    expect(() =>
      dom.mount(createElement(box(Plain), null, createElement('span', { key: 'x' }))),
    ).not.toThrow()
  })
})
