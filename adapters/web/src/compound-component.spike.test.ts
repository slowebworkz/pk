/**
 * Proves the `subComponents` compound-component mechanism end-to-end in the
 * framework-free web adapter: typed compound output (static properties on
 * the custom-element class), derived `enforcement.children` matching by
 * `instanceof` (custom-element children have no vnode-style `.type`, unlike
 * React/Vue), and non-regression for plain (non-compound) usage.
 */
import { describe, it, expect, expectTypeOf, beforeAll, afterEach } from 'vitest'
import { throwDiagnostics } from '@praxis-kit/diagnostics'
import { createContractComponent } from './create-contract-component'

type WebEl = HTMLElement & { update(): void }

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
    define('spike-web-card-header', Header)
    define('spike-web-card-content', Content)
    define('spike-web-card-footer', Footer)
    define('spike-web-card', Card)
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
    const card = document.createElement('spike-web-card')
    card.appendChild(new Card.Header())
    card.appendChild(new Card.Content())
    card.appendChild(new Card.Footer())
    document.body.appendChild(card)

    expect(card.querySelector('spike-web-card-header')).toBeTruthy()
    expect(card.querySelector('spike-web-card-footer')).toBeTruthy()
  })

  it('derives enforcement.children from subComponents via instanceof — custom-element children have no vnode-style .type — and rejects an unlisted child', () => {
    const Stray = createContractComponent({ tag: 'aside', name: 'Stray' })
    define('spike-web-stray', Stray)

    const ClosedCard = createContractComponent({
      tag: 'section',
      name: 'ClosedCard',
      subComponents: { Header, Content, Footer },
      enforcement: { diagnostics: throwDiagnostics, exclusiveChildren: true },
    })
    define('spike-web-closed-card', ClosedCard)

    const card = document.createElement('spike-web-closed-card')
    card.appendChild(new Header())
    card.appendChild(new Stray())
    // Test via update() without connecting to DOM: jsdom wraps errors thrown from
    // connectedCallback in a microtask chain that creates unhandled rejections.
    // update() calls _applyPraxis() directly in synchronous test scope.
    expect(() => (card as WebEl).update()).toThrow(/unexpected child/)
  })

  it('a plain (non-compound) component is unaffected — no subComponents option, no static sub-component properties', () => {
    const Plain = createContractComponent({ tag: 'div', name: 'Plain' })
    expect((Plain as unknown as Record<string, unknown>).Header).toBeUndefined()
  })
})
