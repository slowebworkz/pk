import { beforeEach, afterEach, describe, it, expect } from 'vitest'
import type { AnyRecord, StringMap } from '@praxis-kit/primitive'
import { iterate } from '@praxis-kit/primitive'
import type { ConformanceComponent, ConformanceFactoryOptions } from '../types'
import { silentDiagnostics } from '@praxis-kit/diagnostics'

/**
 * Adapter contract for the hydration parity suite.
 *
 * Both renderToString and renderToDOM must be provided so the suite can
 * compare server-rendered HTML against client-rendered DOM attributes.
 *
 * Run in a `// @vitest-environment jsdom` test file — DOM access is required
 * to mount the client render and read attributes.
 */
export type HydrationConformanceAdapter<C extends ConformanceComponent = ConformanceComponent> = {
  createComponent(options: ConformanceFactoryOptions): C
  /** Returns an HTML string (server render). May be async (e.g. Vue). */
  renderToString(component: C, props?: AnyRecord): string | Promise<string>
  /** Mounts the component and returns the root DOM element (client render). */
  renderToDOM(component: C, props?: AnyRecord): HTMLElement | Promise<HTMLElement>
  /** Called before each test to set up any DOM container. */
  setup(): void
  /** Called after each test to tear down the DOM container. */
  cleanup(): void
}

type Attributes = StringMap<string>

function parseAttributes(html: string): Attributes {
  const tpl = document.createElement('template')
  tpl.innerHTML = html
  const child = tpl.content.firstElementChild
  if (!child) return {}
  const out: Attributes = {}
  iterate.forEach(iterate.items(child.attributes), ({ name, value }) => {
    out[name] = value
  })
  return out
}

function normalizeAttrs(attrs: Attributes): Attributes {
  const out: Attributes = {}
  iterate.forEachEntry(attrs, (k, v) => {
    out[k] = k === 'class' ? v.split(' ').sort().join(' ') : v
  })
  return out
}

async function ssrAttrs<C extends ConformanceComponent>(
  adapter: HydrationConformanceAdapter<C>,
  comp: C,
  props?: AnyRecord,
): Promise<Attributes> {
  const html = await adapter.renderToString(comp, props)
  return normalizeAttrs(parseAttributes(html))
}

async function domAttrs<C extends ConformanceComponent>(
  adapter: HydrationConformanceAdapter<C>,
  comp: C,
  props?: AnyRecord,
): Promise<Attributes> {
  const el = await adapter.renderToDOM(comp, props)
  const out: Attributes = {}
  iterate.forEach(iterate.items(el.attributes), ({ name, value }) => {
    out[name] = value
  })
  return normalizeAttrs(out)
}

/**
 * Hydration parity suite. Verifies that server-rendered HTML and
 * client-rendered DOM produce identical attribute sets.
 *
 * Run in a `// @vitest-environment jsdom` test file.
 */
export function hydrationParitySuite<C extends ConformanceComponent = ConformanceComponent>(
  adapter: HydrationConformanceAdapter<C>,
): void {
  beforeEach(() => adapter.setup())
  afterEach(() => adapter.cleanup())

  describe('hydration parity — class attributes', () => {
    it('base class matches between server and client', async () => {
      const Box = adapter.createComponent({
        styling: { base: 'box-base' },
        enforcement: { diagnostics: silentDiagnostics },
      })
      expect(await ssrAttrs(adapter, Box)).toEqual(await domAttrs(adapter, Box))
    })

    it('variant class matches between server and client', async () => {
      const Box = adapter.createComponent({
        styling: {
          variants: { size: { sm: 'box-sm', lg: 'box-lg' } },
          defaults: { size: 'lg' },
        },
        enforcement: { diagnostics: silentDiagnostics },
      })
      expect(await ssrAttrs(adapter, Box)).toEqual(await domAttrs(adapter, Box))
    })

    it('compound variant class matches between server and client', async () => {
      const Box = adapter.createComponent({
        styling: {
          base: 'btn',
          variants: {
            size: { sm: 'btn-sm', lg: 'btn-lg' },
            intent: { primary: 'btn-primary', ghost: 'btn-ghost' },
          },
          compounds: [{ size: 'lg', intent: 'ghost', class: 'btn-lg-ghost' }],
        },
        enforcement: { diagnostics: silentDiagnostics },
      })
      const props = { size: 'lg', intent: 'ghost' }
      const s = await ssrAttrs(adapter, Box, props)
      const d = await domAttrs(adapter, Box, props)
      expect(s).toEqual(d)
      expect(s['class']?.split(' ')).toContain('btn-lg-ghost')
    })
  })

  describe('hydration parity — ARIA normalisation', () => {
    it('redundant role absent on both server and client', async () => {
      const Nav = adapter.createComponent({
        tag: 'nav',
        enforcement: { diagnostics: silentDiagnostics },
      })
      const props = { role: 'navigation' }
      const s = await ssrAttrs(adapter, Nav, props)
      const d = await domAttrs(adapter, Nav, props)
      expect(s).not.toHaveProperty('role')
      expect(d).not.toHaveProperty('role')
      expect(s).toEqual(d)
    })

    it('non-redundant role present on both server and client', async () => {
      const Box = adapter.createComponent({ enforcement: { diagnostics: silentDiagnostics } })
      const props = { role: 'dialog' }
      const s = await ssrAttrs(adapter, Box, props)
      const d = await domAttrs(adapter, Box, props)
      expect(s['role']).toBe('dialog')
      expect(d['role']).toBe('dialog')
    })
  })

  describe('hydration parity — tag and props', () => {
    it('as prop override: tag matches between server and client', async () => {
      const Box = adapter.createComponent({ enforcement: { diagnostics: silentDiagnostics } })
      const props = { as: 'section' }
      const serverHtml = await adapter.renderToString(Box, props)
      const clientEl = await adapter.renderToDOM(Box, props)
      expect(serverHtml).toContain('<section')
      expect(clientEl.tagName.toLowerCase()).toBe('section')
    })
  })
}
