/**
 * Proves the `subComponents` compound-component mechanism end-to-end in
 * Vue: typed compound output, rendering the attached sub-components as
 * ordinary children, and non-regression for plain (non-compound) usage.
 * Mirrors `adapters/react/src/current/compound-component.spike.test.tsx` —
 * same assertions, proving the framework-neutral core behaves identically
 * here.
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

  it('a plain (non-compound) component is unaffected — no subComponents option', () => {
    const Plain = createContractComponent({ tag: 'div', name: 'Plain' })
    type Expected = PolymorphicComponent<
      PolymorphicGenerics<'div', EmptyRecord, Readonly<EmptyRecord>>
    > &
      EmptyRecord
    expectTypeOf(Plain).toEqualTypeOf({} as Expected)

    expect(() => mount(box(Plain), { slots: { default: () => [h('span')] } })).not.toThrow()
  })
})
