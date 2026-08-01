// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest'
import { render, cleanup, fireEvent } from '@testing-library/svelte'
import Button from './Button.svelte'

afterEach(cleanup)

describe('Button — rendering', () => {
  it('renders a <button>', () => {
    const { container } = render(Button)
    expect(container.querySelector('button')).toBeTruthy()
  })

  it('applies base class', () => {
    const { container } = render(Button)
    expect(container.querySelector('button')!.className).toContain('inline-flex')
  })

  it('applies default variant classes', () => {
    const { container } = render(Button)
    const cls = container.querySelector('button')!.className
    expect(cls).toContain('bg-gray-100')
    expect(cls).toContain('px-4')
  })
})

describe('Button — variants', () => {
  it('applies primary intent', () => {
    const { container } = render(Button, { props: { intent: 'primary' } })
    expect(container.querySelector('button')!.className).toContain('bg-blue-600')
  })

  it('applies sm size', () => {
    const { container } = render(Button, { props: { size: 'sm' } })
    expect(container.querySelector('button')!.className).toContain('px-2')
  })

  it('cta preset applies primary + lg', () => {
    const { container } = render(Button, { props: { recipe: 'cta' } })
    const cls = container.querySelector('button')!.className
    expect(cls).toContain('bg-blue-600')
    expect(cls).toContain('px-6')
  })
})

describe('Button — filterProps', () => {
  it('does not set intent as a DOM attribute', () => {
    const { container } = render(Button, { props: { intent: 'primary' } })
    expect(container.querySelector('button')!.hasAttribute('intent')).toBe(false)
  })

  it('forwards standard HTML attributes', () => {
    const { container } = render(Button, { props: { disabled: true } })
    expect((container.querySelector('button') as HTMLButtonElement).disabled).toBe(true)
  })

  it('does not set loading as a DOM attribute', () => {
    const { container } = render(Button, { props: { loading: true } })
    expect(container.querySelector('button')!.hasAttribute('loading')).toBe(false)
  })

  it('fires onclick', () => {
    let clicked = false
    const { container } = render(Button, {
      props: {
        onclick: () => {
          clicked = true
        },
      },
    })
    fireEvent.click(container.querySelector('button')!)
    expect(clicked).toBe(true)
  })
})
