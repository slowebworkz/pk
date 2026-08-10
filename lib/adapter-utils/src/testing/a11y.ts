import { describe, it, expect } from 'vitest'
import type { ConformanceAdapter, ConformanceComponent } from '../types'

/**
 * A11y conformance suite for framework adapters.
 *
 * Tests keyboard event forwarding, tabIndex, focusability, focus/blur event
 * propagation, disabled state, interactive ARIA attributes, and keyboard
 * activation patterns. Run in a jsdom environment alongside conformanceSuite.
 */
export function conformanceA11ySuite<C extends ConformanceComponent = ConformanceComponent>(
  adapter: ConformanceAdapter<C>,
): void {
  // ── tabIndex ────────────────────────────────────────────────────────────────

  describe('a11y — tabIndex', () => {
    it('forwards tabIndex={0} to the DOM element', () => {
      const Box = adapter.createComponent({})
      const { element } = adapter.render(Box, { tabIndex: 0 })
      expect(element.getAttribute('tabindex')).toBe('0')
    })

    it('forwards tabIndex={-1} to the DOM element', () => {
      const Box = adapter.createComponent({})
      const { element } = adapter.render(Box, { tabIndex: -1 })
      expect(element.getAttribute('tabindex')).toBe('-1')
    })

    it('element with tabIndex={0} is focusable', () => {
      const Box = adapter.createComponent({})
      const { element } = adapter.render(Box, { tabIndex: 0 })
      element.focus()
      expect(document.activeElement).toBe(element)
    })
  })

  // ── focus / blur events ─────────────────────────────────────────────────────

  describe('a11y — focus and blur events', () => {
    it('fires onFocus handler when element receives focus', () => {
      let called = false
      const Box = adapter.createComponent({})
      const { element } = adapter.render(Box, {
        tabIndex: 0,
        onFocus: () => {
          called = true
        },
      })
      element.focus()
      expect(called).toBe(true)
    })

    it('fires onBlur handler on blur dispatch', () => {
      let called = false
      const Box = adapter.createComponent({})
      const { element } = adapter.render(Box, {
        onBlur: () => {
          called = true
        },
      })
      // React/Preact compat use focusout; Vue uses native blur
      element.dispatchEvent(new FocusEvent('focusout', { bubbles: true }))
      element.dispatchEvent(new FocusEvent('blur'))
      expect(called).toBe(true)
    })
  })

  // ── keyboard events ─────────────────────────────────────────────────────────

  describe('a11y — keyboard events', () => {
    it('fires onKeyDown handler', () => {
      let key = ''
      const Box = adapter.createComponent({})
      const { element } = adapter.render(Box, {
        onKeyDown: (e: KeyboardEvent) => {
          key = e.key
        },
      })
      element.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
      expect(key).toBe('Enter')
    })

    it('fires onKeyUp handler', () => {
      let key = ''
      const Box = adapter.createComponent({})
      const { element } = adapter.render(Box, {
        onKeyUp: (e: KeyboardEvent) => {
          key = e.key
        },
      })
      element.dispatchEvent(new KeyboardEvent('keyup', { key: 'Escape', bubbles: true }))
      expect(key).toBe('Escape')
    })

    it('fires onKeyDown for Space key', () => {
      let key = ''
      const Box = adapter.createComponent({})
      const { element } = adapter.render(Box, {
        onKeyDown: (e: KeyboardEvent) => {
          key = e.key
        },
      })
      element.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }))
      expect(key).toBe(' ')
    })
  })

  // ── keyboard activation ─────────────────────────────────────────────────────

  describe('a11y — keyboard activation patterns', () => {
    it('role=button element activates on Enter key', () => {
      let activated = false
      const Box = adapter.createComponent({})
      const { element } = adapter.render(Box, {
        role: 'button',
        tabIndex: 0,
        onKeyDown: (e: KeyboardEvent) => {
          if (e.key === 'Enter') activated = true
        },
      })
      element.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
      expect(activated).toBe(true)
    })

    it('role=button element activates on Space key', () => {
      let activated = false
      const Box = adapter.createComponent({})
      const { element } = adapter.render(Box, {
        role: 'button',
        tabIndex: 0,
        onKeyDown: (e: KeyboardEvent) => {
          if (e.key === ' ') activated = true
        },
      })
      element.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }))
      expect(activated).toBe(true)
    })
  })

  // ── disabled state ──────────────────────────────────────────────────────────

  describe('a11y — disabled state', () => {
    it('forwards disabled attribute on a button', () => {
      const Button = adapter.createComponent({ tag: 'button' })
      const { element } = adapter.render(Button, { disabled: true })
      expect(element.hasAttribute('disabled')).toBe(true)
    })

    it('updates disabled state on rerender', () => {
      const Button = adapter.createComponent({ tag: 'button' })
      const result = adapter.render(Button, { disabled: false })
      expect(result.element.hasAttribute('disabled')).toBe(false)
      result.rerender({ disabled: true })
      expect(result.element.hasAttribute('disabled')).toBe(true)
    })
  })

  // ── interactive ARIA attributes ─────────────────────────────────────────────

  describe('a11y — interactive ARIA attributes', () => {
    it('forwards aria-expanded', () => {
      const Box = adapter.createComponent({})
      const { element } = adapter.render(Box, { 'aria-expanded': 'true' })
      expect(element.getAttribute('aria-expanded')).toBe('true')
    })

    it('forwards aria-pressed', () => {
      const Box = adapter.createComponent({})
      const { element } = adapter.render(Box, { 'aria-pressed': 'true' })
      expect(element.getAttribute('aria-pressed')).toBe('true')
    })

    it('forwards aria-controls', () => {
      const Box = adapter.createComponent({})
      const { element } = adapter.render(Box, { 'aria-controls': 'menu-id' })
      expect(element.getAttribute('aria-controls')).toBe('menu-id')
    })

    it('forwards aria-disabled', () => {
      const Box = adapter.createComponent({})
      const { element } = adapter.render(Box, { 'aria-disabled': 'true' })
      expect(element.getAttribute('aria-disabled')).toBe('true')
    })

    it('forwards aria-labelledby', () => {
      const Box = adapter.createComponent({})
      const { element } = adapter.render(Box, { 'aria-labelledby': 'label-id' })
      expect(element.getAttribute('aria-labelledby')).toBe('label-id')
    })

    it('forwards aria-describedby', () => {
      const Box = adapter.createComponent({})
      const { element } = adapter.render(Box, { 'aria-describedby': 'help-text' })
      expect(element.getAttribute('aria-describedby')).toBe('help-text')
    })

    it('forwards aria-live', () => {
      const Box = adapter.createComponent({})
      const { element } = adapter.render(Box, { 'aria-live': 'polite' })
      expect(element.getAttribute('aria-live')).toBe('polite')
    })

    it('forwards role=button on a non-button element', () => {
      const Box = adapter.createComponent({})
      const { element } = adapter.render(Box, { role: 'button' })
      expect(element.getAttribute('role')).toBe('button')
    })

    it('updates aria-expanded on rerender', () => {
      const Box = adapter.createComponent({})
      const result = adapter.render(Box, { 'aria-expanded': 'false' })
      expect(result.element.getAttribute('aria-expanded')).toBe('false')
      result.rerender({ 'aria-expanded': 'true' })
      expect(result.element.getAttribute('aria-expanded')).toBe('true')
    })
  })

  // ── data attributes ─────────────────────────────────────────────────────────

  describe('a11y — data attributes', () => {
    it('forwards data-state', () => {
      const Box = adapter.createComponent({})
      const { element } = adapter.render(Box, { 'data-state': 'open' })
      expect(element.getAttribute('data-state')).toBe('open')
    })

    it('forwards data-disabled', () => {
      const Box = adapter.createComponent({})
      const { element } = adapter.render(Box, { 'data-disabled': '' })
      expect(element.hasAttribute('data-disabled')).toBe(true)
    })
  })
}
