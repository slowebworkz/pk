import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import type { AnyRecord } from '@praxis-kit/core'
import type { ConformanceAdapter, ConformanceComponent } from '../types'
import { throwDiagnostics, warnDiagnostics, silentDiagnostics } from '@praxis-kit/diagnostics'
import { dynamic } from '@praxis-kit/primitive'
export type {
  BareFactoryOptions,
  ChildSpec,
  ConformanceAdapter,
  ConformanceComponent,
  ConformanceFactoryOptions,
  ConformanceRef,
  RenderResult,
} from '../types'

export function conformanceSuite<C extends ConformanceComponent = ConformanceComponent>(
  adapter: ConformanceAdapter<C>,
): void {
  const caps = {
    asChild: true,
    tagPolymorphism: true,
    domPropFiltering: true,
    dynamicChildRules: false,
    ...adapter.capabilities,
  }

  beforeEach(() => adapter.setup())
  afterEach(() => adapter.cleanup())

  // ── displayName ──────────────────────────────────────────────────────────────

  describe('conformance — displayName', () => {
    it('sets displayName from name option', () => {
      const Comp = adapter.createComponent({ name: 'MyBox' })
      expect(Comp.displayName).toBe('MyBox')
    })

    it('defaults to PolymorphicComponent', () => {
      const Comp = adapter.createComponent({})
      expect(Comp.displayName).toBe('PolymorphicComponent')
    })
  })

  // ── tag rendering ─────────────────────────────────────────────────────────────

  if (caps.tagPolymorphism)
    describe('conformance — tag rendering', () => {
      it('renders default tag (div)', () => {
        const Box = adapter.createComponent({})
        const { element } = adapter.render(Box)
        expect(element.tagName.toLowerCase()).toBe('div')
      })

      it('renders a different tag via the as prop', () => {
        const Box = adapter.createComponent({})
        const { element } = adapter.render(Box, { as: 'section' })
        expect(element.tagName.toLowerCase()).toBe('section')
      })

      it('respects a custom tag option', () => {
        const Box = adapter.createComponent({ tag: 'span' })
        const { element } = adapter.render(Box)
        expect(element.tagName.toLowerCase()).toBe('span')
      })
    })

  // ── class merging ─────────────────────────────────────────────────────────────

  describe('conformance — class merging', () => {
    it('applies base class', () => {
      const Box = adapter.createComponent({ styling: { base: 'base-cls' } })
      const { element } = adapter.render(Box)
      expect(element.className).toContain('base-cls')
    })

    it('merges caller class with base class', () => {
      const Box = adapter.createComponent({ styling: { base: 'base' } })
      const { element } = adapter.render(Box, { class: 'extra' })
      expect(element.className).toContain('base')
      expect(element.className).toContain('extra')
    })
  })

  // ── style forwarding ──────────────────────────────────────────────────────────

  describe('conformance — style forwarding', () => {
    it('applies an inline style object', () => {
      const Box = adapter.createComponent({})
      const { element } = adapter.render(Box, { style: { color: 'red' } })
      expect(element.style.color).toBe('red')
    })
  })

  // ── prop forwarding ───────────────────────────────────────────────────────────

  describe('conformance — prop forwarding', () => {
    it('forwards extra attributes to the DOM element', () => {
      const Box = adapter.createComponent({})
      const { element } = adapter.render(Box, { 'data-testid': 'box' })
      expect(element.getAttribute('data-testid')).toBe('box')
    })

    if (caps.domPropFiltering)
      it('strips variant keys before DOM forwarding', () => {
        const Box = adapter.createComponent({
          styling: { variants: { size: { sm: 'text-sm', lg: 'text-lg' } } },
        })
        const { element } = adapter.render(Box, { size: 'lg' })
        expect(element.getAttribute('size')).toBeNull()
      })

    if (caps.domPropFiltering)
      it('custom filterProps strips matching keys', () => {
        const Box = adapter.createComponent({
          filterProps: (key) => key === 'loading',
        })
        const { element } = adapter.render(Box, { loading: 'true', 'data-keep': 'yes' })
        expect(element.getAttribute('loading')).toBeNull()
        expect(element.getAttribute('data-keep')).toBe('yes')
      })
  })

  // ── prop normalization ordering ──────────────────────────────────────────────

  describe('conformance — prop normalization ordering', () => {
    it("a normalize option observes the HTML built-in normalizers' output", () => {
      // On <button>, the built-in `disabledProps` sets aria-disabled="true" when
      // `disabled` is present. Every adapter (and the SSR path) must run the
      // caller's `normalize` *after* the HTML built-ins, so it can see that
      // value — the ordering React documents. When the order is reversed,
      // `normalize` runs first, sees no aria-disabled, and the marker is absent.
      const Btn = adapter.createComponent({
        tag: 'button',
        normalize: (props: AnyRecord) =>
          props['aria-disabled'] === 'true' ? { ...props, 'data-observed-aria': 'yes' } : props,
      })
      const { element } = adapter.render(Btn, { disabled: true })
      expect(element.getAttribute('data-observed-aria')).toBe('yes')
    })
  })

  // ── ARIA forwarding ───────────────────────────────────────────────────────────

  describe('conformance — ARIA forwarding', () => {
    it('forwards aria-label to the DOM element', () => {
      const Box = adapter.createComponent({})
      const { element } = adapter.render(Box, { 'aria-label': 'Close' })
      expect(element.getAttribute('aria-label')).toBe('Close')
    })

    it('forwards aria-describedby to the DOM element', () => {
      const Box = adapter.createComponent({})
      const { element } = adapter.render(Box, { 'aria-describedby': 'hint' })
      expect(element.getAttribute('aria-describedby')).toBe('hint')
    })

    it('forwards a non-redundant role to the DOM element', () => {
      // 'dialog' is not the implicit role of a div — it must be forwarded.
      const Box = adapter.createComponent({})
      const { element } = adapter.render(Box, { role: 'dialog' })
      expect(element.getAttribute('role')).toBe('dialog')
    })
  })

  // ── event forwarding ──────────────────────────────────────────────────────────

  describe('conformance — event forwarding', () => {
    it('fires onClick handler', () => {
      let called = false
      const Box = adapter.createComponent({})
      const { element } = adapter.render(Box, {
        onClick: () => {
          called = true
        },
      })
      element.click()
      expect(called).toBe(true)
    })

    it('fires onFocus handler', () => {
      let called = false
      const Box = adapter.createComponent({})
      const { element } = adapter.render(Box, {
        onFocus: () => {
          called = true
        },
      })
      // React/Preact compat listen on focusin; Vue listens on native focus
      element.dispatchEvent(new FocusEvent('focusin', { bubbles: true }))
      element.dispatchEvent(new FocusEvent('focus'))
      expect(called).toBe(true)
    })

    it('fires onBlur handler', () => {
      let called = false
      const Box = adapter.createComponent({})
      const { element } = adapter.render(Box, {
        onBlur: () => {
          called = true
        },
      })
      // React/Preact compat listen on focusout; Vue listens on native blur
      element.dispatchEvent(new FocusEvent('focusout', { bubbles: true }))
      element.dispatchEvent(new FocusEvent('blur'))
      expect(called).toBe(true)
    })
  })

  // ── ref forwarding ────────────────────────────────────────────────────────────

  if (adapter.createRef) {
    describe('conformance — ref forwarding', () => {
      it('forwards ref to the DOM element', () => {
        const ref = adapter.createRef!()
        const Box = adapter.createComponent({})
        adapter.render(Box, { ref })
        expect(ref.current).toBeInstanceOf(HTMLElement)
      })

      it('forwards ref when rendered as a different tag', () => {
        const ref = adapter.createRef!()
        const Box = adapter.createComponent({})
        adapter.render(Box, { as: 'button', ref })
        expect(ref.current).toBeInstanceOf(HTMLElement)
        expect(ref.current!.tagName.toLowerCase()).toBe('button')
      })

      if (caps.asChild)
        it('forwards ref through asChild to the inner element', () => {
          const ref = adapter.createRef!()
          const Box = adapter.createComponent({})
          adapter.render(Box, { asChild: true, ref }, [{ tag: 'button' }])
          expect(ref.current).toBeInstanceOf(HTMLElement)
          expect(ref.current!.tagName.toLowerCase()).toBe('button')
        })
    })
  }

  // ── children ──────────────────────────────────────────────────────────────────

  describe('conformance — children', () => {
    it('renders children', () => {
      const Box = adapter.createComponent({})
      const { element } = adapter.render(Box, {}, [{ tag: 'span', props: { id: 'child' } }])
      expect(element.querySelector('span#child')).toBeTruthy()
    })
  })

  // ── asChild ───────────────────────────────────────────────────────────────────

  if (caps.asChild)
    describe('conformance — asChild', () => {
      it('renders the child element type instead of the default tag', () => {
        const Box = adapter.createComponent({})
        const { element } = adapter.render(Box, { asChild: true }, [{ tag: 'button' }])
        expect(element.tagName.toLowerCase()).toBe('button')
      })

      it('merges base class onto the asChild element', () => {
        const Box = adapter.createComponent({ styling: { base: 'box-cls' } })
        const { element } = adapter.render(Box, { asChild: true }, [{ tag: 'button' }])
        expect(element.className).toContain('box-cls')
      })

      it('throws when asChild has zero children', () => {
        const Box = adapter.createComponent({})
        expect(() => adapter.render(Box, { asChild: true }, [])).toThrow()
      })

      it('throws when asChild has multiple children', () => {
        const Box = adapter.createComponent({})
        expect(() =>
          adapter.render(Box, { asChild: true }, [{ tag: 'span' }, { tag: 'span' }]),
        ).toThrow()
      })

      it('throws when as and asChild are both provided', () => {
        const Box = adapter.createComponent({})
        expect(() => adapter.render(Box, { as: 'button', asChild: true }, [{ tag: 'a' }])).toThrow()
      })

      it('nested asChild: composes classes from both components onto the inner element', () => {
        const BoxA = adapter.createComponent({ styling: { base: 'class-a' } })
        const BoxB = adapter.createComponent({ styling: { base: 'class-b' } })
        // <BoxA asChild><BoxB asChild><button /></BoxB></BoxA>
        const { element } = adapter.render(BoxA, { asChild: true }, [
          { component: BoxB, props: { asChild: true }, children: [{ tag: 'button' }] },
        ])
        expect(element.className).toContain('class-a')
        expect(element.className).toContain('class-b')
        expect(element.tagName.toLowerCase()).toBe('button')
      })
    })

  // ── variants ──────────────────────────────────────────────────────────────────

  describe('conformance — variants', () => {
    it('applies variant class via default', () => {
      const Box = adapter.createComponent({
        styling: {
          variants: { intent: { primary: 'bg-blue', secondary: 'bg-gray' } },
          defaults: { intent: 'primary' },
        },
      })
      const { element } = adapter.render(Box)
      expect(element.className).toContain('bg-blue')
    })

    it('applies variant class from prop', () => {
      const Box = adapter.createComponent({
        styling: { variants: { size: { sm: 'text-sm', lg: 'text-lg' } } },
      })
      const { element } = adapter.render(Box, { size: 'lg' })
      expect(element.className).toContain('text-lg')
    })

    it('applies compound class when all conditions are met', () => {
      const Box = adapter.createComponent({
        styling: {
          variants: {
            intent: { primary: 'btn-primary', secondary: 'btn-secondary' },
            size: { sm: 'btn-sm', lg: 'btn-lg' },
          },
          compounds: [{ intent: 'primary', size: 'lg', class: 'btn-primary-lg' }],
        },
      })
      const { element } = adapter.render(Box, { intent: 'primary', size: 'lg' })
      expect(element.className).toContain('btn-primary-lg')
    })

    it('does not apply compound class when only some conditions are met', () => {
      const Box = adapter.createComponent({
        styling: {
          variants: {
            intent: { primary: 'btn-primary', secondary: 'btn-secondary' },
            size: { sm: 'btn-sm', lg: 'btn-lg' },
          },
          compounds: [{ intent: 'primary', size: 'lg', class: 'btn-primary-lg' }],
        },
      })
      const { element } = adapter.render(Box, { intent: 'primary', size: 'sm' })
      expect(element.className).not.toContain('btn-primary-lg')
    })

    it('activates a preset via recipe', () => {
      const Box = adapter.createComponent({
        styling: {
          variants: {
            intent: { primary: 'bg-blue', secondary: 'bg-gray' },
            size: { sm: 'text-sm', lg: 'text-lg' },
          },
          presets: { cta: { intent: 'primary', size: 'lg' } },
        },
      })
      const { element } = adapter.render(Box, { recipe: 'cta' })
      expect(element.className).toContain('bg-blue')
      expect(element.className).toContain('text-lg')
    })
  })

  // ── enforcement ───────────────────────────────────────────────────────────────

  describe('conformance — enforcement', () => {
    it('throws when children count is below min (throwDiagnostics)', () => {
      const Group = adapter.createComponent({
        enforcement: {
          diagnostics: throwDiagnostics,
          children: [
            { name: 'Item', match: (c): c is unknown => !!c || !c, cardinality: { min: 2 } },
          ],
        },
      })
      // 1 child provided; rule requires at least 2
      expect(() => adapter.render(Group, {}, [{ tag: 'span' }])).toThrow()
    })

    it('throws when children count exceeds max (throwDiagnostics)', () => {
      const Group = adapter.createComponent({
        enforcement: {
          diagnostics: throwDiagnostics,
          children: [
            { name: 'Item', match: (c): c is unknown => !!c || !c, cardinality: { max: 2 } },
          ],
        },
      })
      // 3 children provided; rule allows at most 2
      expect(() =>
        adapter.render(Group, {}, [{ tag: 'span' }, { tag: 'span' }, { tag: 'span' }]),
      ).toThrow()
    })

    it('warns but does not throw when warnDiagnostics', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      const Group = adapter.createComponent({
        enforcement: {
          diagnostics: warnDiagnostics,
          children: [
            {
              name: 'Item',
              match: (c): c is unknown => !!c || !c,
              cardinality: { min: 2, max: 2 },
            },
          ],
        },
      })
      expect(() => adapter.render(Group, {}, [{ tag: 'span' }])).not.toThrow()
      expect(warnSpy).toHaveBeenCalled()
      warnSpy.mockRestore()
    })

    it('is silent when silentDiagnostics', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      const Group = adapter.createComponent({
        enforcement: {
          diagnostics: silentDiagnostics,
          children: [
            {
              name: 'Item',
              match: (c): c is unknown => !!c || !c,
              cardinality: { min: 2, max: 2 },
            },
          ],
        },
      })
      expect(() => adapter.render(Group, {}, [{ tag: 'span' }])).not.toThrow()
      expect(warnSpy).not.toHaveBeenCalled()
      warnSpy.mockRestore()
    })
  })

  // ── dynamic(...) child rule cardinality ─────────────────────────────────────────

  if (caps.dynamicChildRules)
    describe('conformance — dynamic(...) child rule cardinality', () => {
      // Mirrors the forcing example for context-aware child enforcement: a
      // component whose `as` resolves to 'section' requires at least one Item,
      // but resolved to a plain 'div' makes Items optional.
      const dynamicCardinalityOptions = {
        enforcement: {
          diagnostics: throwDiagnostics,
          children: [
            {
              name: 'Item',
              match: (c: unknown): c is unknown => !!c || !c,
              cardinality: dynamic((ctx: { tag: unknown }) =>
                ctx.tag === 'section' ? { min: 1 } : { min: 0 },
              ),
            },
          ],
        },
      }

      it('requires at least one child when the resolved tag is "section"', () => {
        const Group = adapter.createComponent(dynamicCardinalityOptions)
        expect(() => adapter.render(Group, { as: 'section' }, [])).toThrow()
        expect(() => adapter.render(Group, { as: 'section' }, [{ tag: 'span' }])).not.toThrow()
      })

      it('allows zero children when the resolved tag is "div"', () => {
        const Group = adapter.createComponent(dynamicCardinalityOptions)
        expect(() => adapter.render(Group, { as: 'div' }, [])).not.toThrow()
      })

      it('re-resolves on rerender when the tag changes', () => {
        const Group = adapter.createComponent(dynamicCardinalityOptions)
        const result = adapter.render(Group, { as: 'div' }, [])
        expect(() => result.rerender({ as: 'section' }, [])).toThrow()
      })
    })

  // ── reactivity ────────────────────────────────────────────────────────────────

  describe('conformance — reactivity', () => {
    it('updates class when variant prop changes on rerender', () => {
      const Box = adapter.createComponent({
        styling: { variants: { size: { sm: 'text-sm', lg: 'text-lg' } } },
      })
      const result = adapter.render(Box, { size: 'sm' })
      expect(result.element.className).toContain('text-sm')
      result.rerender({ size: 'lg' })
      expect(result.element.className).toContain('text-lg')
    })

    if (caps.tagPolymorphism)
      it('switches rendered tag on rerender with a new as prop', () => {
        const Box = adapter.createComponent({})
        const result = adapter.render(Box, { as: 'div' })
        expect(result.element.tagName.toLowerCase()).toBe('div')
        result.rerender({ as: 'section' })
        expect(result.element.tagName.toLowerCase()).toBe('section')
      })
  })
}
