// @vitest-environment jsdom
/**
 * Proves the `subComponents` compound-component mechanism end-to-end in
 * Svelte: typed compound output, rendering the attached sub-components as
 * ordinary children, and non-regression for plain (non-compound) usage.
 */
import { describe, it, expect, expectTypeOf, afterEach } from 'vitest'
import { render, cleanup } from '@testing-library/svelte'
import { createContractComponent } from './create-contract-component'
import Polymorphic from './Polymorphic.svelte'
import Host from './compound-component.spike-host.svelte'

afterEach(cleanup)

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

  it('renders the assembled sub-components as ordinary children', () => {
    const { container } = render(Host, { root: Card, childBundles: [Header, Content, Footer] })
    const section = container.querySelector('section')!
    expect(section.querySelector('header')).toBeTruthy()
    expect(section.querySelector('footer')).toBeTruthy()
  })

  it('a plain (non-compound) component is unaffected — no subComponents option', () => {
    const Plain = createContractComponent({ tag: 'div' as const, name: 'Plain' })
    // No subComponents were passed, so assembleCompoundComponent short-circuits and
    // returns the bundle untouched — same own keys as any plain buildRuntime() bundle.
    expect(Object.keys(Plain)).toEqual(['runtime', 'filterProps', 'slotValidator'])

    expect(() => render(Polymorphic, { bundle: Plain })).not.toThrow()
  })
})
