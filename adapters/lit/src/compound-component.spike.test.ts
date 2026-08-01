/**
 * Proves the `subComponents` compound-component mechanism end-to-end in Lit:
 * typed compound output (static properties on the custom-element class),
 * rendering the attached sub-components as ordinary children, and
 * non-regression for plain (non-compound) usage.
 */
import { describe, it, expect, expectTypeOf, beforeAll, afterEach } from 'vitest'
import { createContractComponent } from './create-contract-component'

type LitEl = HTMLElement & { updateComplete: Promise<boolean> }

function define(name: string, ctor: CustomElementConstructor) {
  if (!customElements.get(name)) customElements.define(name, ctor)
}

afterEach(() => {
  document.body.innerHTML = ''
})

describe('subComponents (compound component generation spike)', () => {
  const Header = createContractComponent({ tag: 'header', name: 'CardHeader' })
  const Content = createContractComponent({ tag: 'div', name: 'CardContent' })
  const Footer = createContractComponent({ tag: 'footer', name: 'CardFooter' })

  const Card = createContractComponent({
    tag: 'section',
    name: 'Card',
    subComponents: { Header, Content, Footer },
  })

  beforeAll(() => {
    define('spike-card-header', Header)
    define('spike-card-content', Content)
    define('spike-card-footer', Footer)
    define('spike-card', Card)
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

  it('renders the assembled sub-components as ordinary children', async () => {
    const card = document.createElement('spike-card')
    card.appendChild(new Card.Header())
    card.appendChild(new Card.Content())
    card.appendChild(new Card.Footer())
    document.body.appendChild(card)
    await (card as unknown as LitEl).updateComplete

    expect(card.querySelector('spike-card-header')).toBeTruthy()
    expect(card.querySelector('spike-card-footer')).toBeTruthy()
  })

  it('a plain (non-compound) component is unaffected — no subComponents option, no static sub-component properties', () => {
    const Plain = createContractComponent({ tag: 'div', name: 'Plain' })
    expect((Plain as unknown as Record<string, unknown>).Header).toBeUndefined()
  })
})
