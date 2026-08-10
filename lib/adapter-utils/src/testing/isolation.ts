import { describe, it, expect } from 'vitest'
import type { ConformanceAdapter, ConformanceComponent } from '../types'
import { silentDiagnostics } from '@praxis-kit/diagnostics'

/**
 * Isolation conformance suite.
 *
 * Verifies that two components created from the same factory are fully
 * independent — variant pipelines, ARIA engines, filterProps, and strict
 * mode are per-factory closures with no shared mutable state.
 *
 * These tests catch accidental module-level singletons, static fields, or
 * mutated shared references that would cause one component's configuration
 * to bleed into another.
 */
export function conformanceIsolationSuite<C extends ConformanceComponent = ConformanceComponent>(
  adapter: ConformanceAdapter<C>,
): void {
  const caps = { domPropFiltering: true, ...adapter.capabilities }

  describe('conformance — component isolation', () => {
    // ── Independent class pipelines ───────────────────────────────────────────

    it('two components with different base classes render independently', () => {
      const Box = adapter.createComponent({
        styling: { base: 'box-base' },
        enforcement: { diagnostics: silentDiagnostics },
      })
      const Button = adapter.createComponent({
        styling: { base: 'btn-base' },
        enforcement: { diagnostics: silentDiagnostics },
      })

      const boxEl = adapter.render(Box).element
      const btnEl = adapter.render(Button).element

      expect(boxEl.className).toContain('box-base')
      expect(boxEl.className).not.toContain('btn-base')
      expect(btnEl.className).toContain('btn-base')
      expect(btnEl.className).not.toContain('box-base')
    })

    it('variant definitions on one component do not affect another', () => {
      const Box = adapter.createComponent({
        styling: { variants: { size: { sm: 'text-sm', lg: 'text-lg' } } },
        enforcement: { diagnostics: silentDiagnostics },
      })
      const Button = adapter.createComponent({
        styling: { variants: { intent: { primary: 'bg-blue', ghost: 'bg-transparent' } } },
        enforcement: { diagnostics: silentDiagnostics },
      })

      const boxEl = adapter.render(Box, { size: 'lg' }).element
      const btnEl = adapter.render(Button, { intent: 'primary' }).element

      expect(boxEl.className).toContain('text-lg')
      expect(boxEl.className).not.toContain('bg-blue')
      expect(btnEl.className).toContain('bg-blue')
      expect(btnEl.className).not.toContain('text-lg')
    })

    it('default variants on one component do not apply to another', () => {
      const Box = adapter.createComponent({
        styling: {
          variants: { size: { sm: 'text-sm', lg: 'text-lg' } },
          defaults: { size: 'lg' },
        },
        enforcement: { diagnostics: silentDiagnostics },
      })
      const Button = adapter.createComponent({
        styling: { variants: { size: { sm: 'text-sm', lg: 'text-lg' } } },
        enforcement: { diagnostics: silentDiagnostics },
      })

      // Render Box twice to warm any default cache, then render Button fresh.
      adapter.render(Box)
      adapter.render(Box)
      const btnEl = adapter.render(Button).element

      // Box has a default; Button does not — no default must leak.
      expect(btnEl.className).not.toContain('text-lg')
      expect(btnEl.className).not.toContain('text-sm')
    })

    // ── Independent filterProps ───────────────────────────────────────────────

    if (caps.domPropFiltering)
      it('filterProps on one component does not filter on another', () => {
        const Filtered = adapter.createComponent({
          filterProps: (key) => key === 'loading',
          enforcement: { diagnostics: silentDiagnostics },
        })
        const Plain = adapter.createComponent({
          enforcement: { diagnostics: silentDiagnostics },
        })

        const filteredEl = adapter.render(Filtered, { 'data-id': 'a', loading: 'true' }).element
        const plainEl = adapter.render(Plain, { 'data-id': 'b', loading: 'true' }).element

        // Filtered component must strip loading; Plain must keep it.
        expect(filteredEl.getAttribute('data-id')).toBe('a')
        expect(filteredEl.hasAttribute('loading')).toBe(false)
        expect(plainEl.getAttribute('data-id')).toBe('b')
        expect(plainEl.getAttribute('loading')).toBe('true')
      })

    // ── Independent naming ────────────────────────────────────────────────────

    it('displayName is independent per component', () => {
      const Box = adapter.createComponent({
        name: 'Box',
        enforcement: { diagnostics: silentDiagnostics },
      })
      const Button = adapter.createComponent({
        name: 'Button',
        enforcement: { diagnostics: silentDiagnostics },
      })

      expect(Box.displayName).toBe('Box')
      expect(Button.displayName).toBe('Button')
    })

    // ── Re-render isolation ───────────────────────────────────────────────────

    it('re-rendering one component does not change the other', () => {
      const Box = adapter.createComponent({
        styling: { base: 'box', variants: { size: { sm: 'text-sm', lg: 'text-lg' } } },
        enforcement: { diagnostics: silentDiagnostics },
      })
      const Button = adapter.createComponent({
        styling: { base: 'btn' },
        enforcement: { diagnostics: silentDiagnostics },
      })

      const boxResult = adapter.render(Box, { size: 'sm' })
      const btnResult = adapter.render(Button)

      const btnClassBefore = btnResult.element.className
      const btnHtmlBefore = btnResult.element.outerHTML

      boxResult.rerender({ size: 'lg' })

      expect(btnResult.element.className).toBe(btnClassBefore)
      expect(btnResult.element.outerHTML).toBe(btnHtmlBefore)
    })

    // ── Config mutation guard ─────────────────────────────────────────────────

    it('creating a component does not mutate the variants config object', () => {
      const variants = { size: { sm: 'text-sm', lg: 'text-lg' } }
      const snapshot = JSON.stringify(variants)

      adapter.createComponent({
        styling: { variants },
        enforcement: { diagnostics: silentDiagnostics },
      })

      expect(JSON.stringify(variants)).toBe(snapshot)
    })
  })
}
