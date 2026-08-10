import { describe, it, expect } from 'vitest'
import type { ConformanceAdapter, ConformanceComponent } from '../types'
import { silentDiagnostics } from '@praxis-kit/diagnostics'

/**
 * Performance conformance suite.
 *
 * Verifies that the class pipeline is idempotent and that caches produce
 * stable, consistent output. These tests do not measure speed — they verify
 * the correctness invariants that make caching safe:
 *
 *   1. Same props → same className on repeated renders (cache hits are safe).
 *   2. Different props → different className (cache doesn't over-eagerly dedup).
 *   3. Base class is always present regardless of variant changes (base never cleared).
 *   4. Interleaved renders of two components don't cross-contaminate (no shared state).
 */
export function conformancePerformanceSuite<C extends ConformanceComponent = ConformanceComponent>(
  adapter: ConformanceAdapter<C>,
): void {
  describe('conformance — deterministic class generation', () => {
    // ── Same props → stable output ──────────────────────────────────────────

    it('repeated renders with identical props produce the same className', () => {
      const Box = adapter.createComponent({
        styling: {
          base: 'box-base',
          variants: { size: { sm: 'text-sm', lg: 'text-lg' } },
          defaults: { size: 'sm' },
        },
        enforcement: { diagnostics: silentDiagnostics },
      })

      const result = adapter.render(Box, { size: 'lg' })
      const first = result.element.className

      result.rerender({ size: 'lg' })
      expect(result.element.className).toBe(first)

      result.rerender({ size: 'lg' })
      expect(result.element.className).toBe(first)
    })

    it('repeated renders without props produce the same className', () => {
      const Box = adapter.createComponent({
        styling: { base: 'base', variants: { size: { sm: 'text-sm' } }, defaults: { size: 'sm' } },
        enforcement: { diagnostics: silentDiagnostics },
      })

      const result = adapter.render(Box)
      const first = result.element.className

      result.rerender()
      expect(result.element.className).toBe(first)
    })

    // ── Variant changes produce different output ──────────────────────────────

    it('different variant values produce different className', () => {
      const Box = adapter.createComponent({
        styling: { variants: { size: { sm: 'text-sm', lg: 'text-lg' } } },
        enforcement: { diagnostics: silentDiagnostics },
      })

      const result = adapter.render(Box, { size: 'sm' })
      const small = result.element.className

      result.rerender({ size: 'lg' })
      const large = result.element.className

      expect(small).not.toBe(large)
      expect(small).toContain('text-sm')
      expect(large).toContain('text-lg')
    })

    // ── Base class stability ───────────────────────────────────────────────────

    it('base class is always present after multiple variant changes', () => {
      const Box = adapter.createComponent({
        styling: {
          base: 'base-cls',
          variants: { size: { sm: 'text-sm', lg: 'text-lg' } },
        },
        enforcement: { diagnostics: silentDiagnostics },
      })

      const result = adapter.render(Box, { size: 'sm' })
      expect(result.element.className).toContain('base-cls')

      result.rerender({ size: 'lg' })
      expect(result.element.className).toContain('base-cls')

      result.rerender({ size: 'sm' })
      expect(result.element.className).toContain('base-cls')
    })

    // ── Interleaved renders don't cross-contaminate ───────────────────────────

    it('interleaved renders of two components are independent', () => {
      const Box = adapter.createComponent({
        styling: { base: 'box', variants: { size: { sm: 'text-sm', lg: 'text-lg' } } },
        enforcement: { diagnostics: silentDiagnostics },
      })
      const Button = adapter.createComponent({
        styling: { base: 'btn', variants: { intent: { primary: 'btn-primary' } } },
        enforcement: { diagnostics: silentDiagnostics },
      })

      const boxResult = adapter.render(Box, { size: 'sm' })
      const btnResult = adapter.render(Button, { intent: 'primary' })

      expect(boxResult.element.className).toContain('box')
      expect(boxResult.element.className).toContain('text-sm')
      expect(btnResult.element.className).toContain('btn')
      expect(btnResult.element.className).toContain('btn-primary')

      boxResult.rerender({ size: 'lg' })

      // Button must be unaffected by Box re-render
      expect(btnResult.element.className).toContain('btn')
      expect(btnResult.element.className).toContain('btn-primary')
      expect(btnResult.element.className).not.toContain('text-lg')
    })

    // ── Compound variant idempotency and activation/deactivation ─────────────

    it('compound variant output is stable across repeated renders', () => {
      const Box = adapter.createComponent({
        styling: {
          base: 'base',
          variants: {
            size: { sm: 'text-sm', lg: 'text-lg' },
            intent: { primary: 'bg-blue', ghost: 'bg-transparent' },
          },
          compounds: [{ size: 'lg', intent: 'primary', class: 'compound-cls' }],
        },
        enforcement: { diagnostics: silentDiagnostics },
      })

      const result = adapter.render(Box, { size: 'lg', intent: 'primary' })
      const first = result.element.className
      expect(first).toContain('compound-cls')

      result.rerender({ size: 'lg', intent: 'primary' })
      expect(result.element.className).toBe(first)
    })

    it('compound class appears and disappears correctly across re-renders', () => {
      const Box = adapter.createComponent({
        styling: {
          base: 'base',
          variants: {
            size: { sm: 'text-sm', lg: 'text-lg' },
            intent: { primary: 'bg-blue', ghost: 'bg-transparent' },
          },
          compounds: [{ size: 'lg', intent: 'primary', class: 'compound-cls' }],
        },
        enforcement: { diagnostics: silentDiagnostics },
      })

      const result = adapter.render(Box, { size: 'lg', intent: 'primary' })
      expect(result.element.className).toContain('compound-cls')

      result.rerender({ size: 'lg', intent: 'ghost' })
      expect(result.element.className).not.toContain('compound-cls')

      result.rerender({ size: 'lg', intent: 'primary' })
      expect(result.element.className).toContain('compound-cls')
    })

    // ── Class duplication ─────────────────────────────────────────────────────

    it('repeated re-renders do not accumulate duplicate classes', () => {
      const Box = adapter.createComponent({
        styling: {
          base: 'base',
          variants: { size: { lg: 'text-lg' } },
        },
        enforcement: { diagnostics: silentDiagnostics },
      })

      const result = adapter.render(Box, { size: 'lg' })
      result.rerender({ size: 'lg' })
      result.rerender({ size: 'lg' })

      const cls = result.element.className
      expect((cls.match(/\btext-lg\b/g) ?? []).length).toBe(1)
      expect((cls.match(/\bbase\b/g) ?? []).length).toBe(1)
    })

    // ── Multiple instances of the same component ──────────────────────────────

    it('two instances of the same component are independent', () => {
      const Box = adapter.createComponent({
        styling: { base: 'box', variants: { size: { sm: 'text-sm', lg: 'text-lg' } } },
        enforcement: { diagnostics: silentDiagnostics },
      })

      const a = adapter.render(Box, { size: 'sm' })
      const b = adapter.render(Box, { size: 'lg' })

      expect(a.element.className).toContain('text-sm')
      expect(a.element.className).not.toContain('text-lg')
      expect(b.element.className).toContain('text-lg')
      expect(b.element.className).not.toContain('text-sm')

      a.rerender({ size: 'lg' })

      expect(a.element.className).toContain('text-lg')
      // b must be unaffected
      expect(b.element.className).toContain('text-lg')
      expect(b.element.className).not.toContain('text-sm')
    })

    // ── Undefined vs omitted props ────────────────────────────────────────────

    it('omitted variant prop and undefined variant prop produce the same default output', () => {
      const Box = adapter.createComponent({
        styling: {
          variants: { size: { sm: 'text-sm', lg: 'text-lg' } },
          defaults: { size: 'sm' },
        },
        enforcement: { diagnostics: silentDiagnostics },
      })

      const withUndefined = adapter.render(Box, { size: undefined }).element.className
      const withOmitted = adapter.render(Box).element.className

      expect(withUndefined).toBe(withOmitted)
      expect(withOmitted).toContain('text-sm')
    })
  })
}
