// @vitest-environment jsdom
/**
 * Proves the `subComponents` compound-component mechanism end-to-end in
 * Solid: typed compound output, rendering the attached sub-components as
 * ordinary children, and non-regression for plain (non-compound) usage.
 */
import { describe, it, expect, expectTypeOf, afterEach } from 'vitest'
import { render as solidRender, cleanup } from '@solidjs/testing-library'
import type { EmptyRecord, PolymorphicGenerics } from '@praxis-kit/core'
import type { PolymorphicComponent } from './types'
import { createContractComponent } from './create-contract-component'

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

  it('ComponentProps-style call-signature extraction still resolves the root’s own props, unaffected by the sub-component intersection', () => {
    type RootProps = Parameters<typeof Card>[0]
    expectTypeOf<RootProps>().toMatchTypeOf<{ as?: unknown }>()
  })

  it('renders the assembled sub-components as ordinary children', () => {
    const { container } = solidRender(() => (
      <Card>
        <Card.Header />
        <Card.Content />
        <Card.Footer />
      </Card>
    ))
    const section = container.querySelector('section')!
    expect(section.querySelector('header')).toBeTruthy()
    expect(section.querySelector('footer')).toBeTruthy()
  })

  it('a plain (non-compound) component is unaffected — no subComponents option', () => {
    const Plain = createContractComponent({ tag: 'div' as const, name: 'Plain' })
    type Expected = PolymorphicComponent<
      PolymorphicGenerics<'div', EmptyRecord, Readonly<EmptyRecord>>
    >
    expectTypeOf(Plain).toEqualTypeOf({} as Expected)

    expect(() => solidRender(() => <Plain>{'span content'}</Plain>)).not.toThrow()
  })
})
