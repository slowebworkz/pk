import { describe, it, expect, vi } from 'vitest'
import { createElement, isValidElement } from 'react'
import type { ReactElement } from 'react'
import { throwDiagnostics, warnDiagnostics, silentDiagnostics } from '@praxis-kit/diagnostics'
import { render } from './render'
import { normalizeChildren as realNormalizeChildren } from '../current/normalize-children'
import { Slottable } from './slot'
import { SlotValidator } from '@praxis-kit/adapter-utils'
import type { ChildrenEvaluator } from '@praxis-kit/core'
import type { FilterPredicate, Runtime } from './types'

function makeRuntime(overrides?: Partial<Runtime>): Runtime {
  return {
    options: {
      defaultTag: 'div',
      variantKeys: new Set(),
      displayName: 'Test',
      diagnostics: throwDiagnostics,
    },
    resolveTag: (as) => as ?? 'div',
    resolveProps: (props) => props,
    resolveClasses: (_tag, _props, className) =>
      Array.isArray(className) ? className.join(' ') : (className ?? ''),
    resolveAria: (_tag, props) => ({ props }),
    ...overrides,
  }
}

const noopNormalize = (children: unknown): ReactElement[] =>
  isValidElement(children) ? [children as ReactElement] : []

const slotComponent = ({ children }: { children?: unknown }) =>
  createElement('div', { 'data-slot': true }, children as ReactElement)

const noopFilter: FilterPredicate = () => false
const defaultValidator = new SlotValidator('Test', throwDiagnostics, 'React element')

describe('render', () => {
  it('renders the default tag when no as prop is given', () => {
    const el = render({
      runtime: makeRuntime(),
      props: {},
      ref: null,
      slotComponent,
      normalizeChildren: noopNormalize,
      filterProps: noopFilter,
      slotValidator: defaultValidator,
    })
    expect(el.type).toBe('div')
  })

  it('renders the tag specified by the as prop', () => {
    const el = render({
      runtime: makeRuntime(),
      props: { as: 'button' },
      ref: null,
      slotComponent,
      normalizeChildren: noopNormalize,
      filterProps: noopFilter,
      slotValidator: defaultValidator,
    })
    expect(el.type).toBe('button')
  })

  it('passes className to the element', () => {
    const runtime = makeRuntime({
      resolveClasses: () => 'resolved-class',
    })
    const el = render({
      runtime,
      props: { className: 'caller-class' },
      ref: null,
      slotComponent,
      normalizeChildren: noopNormalize,
      filterProps: noopFilter,
      slotValidator: defaultValidator,
    })
    expect((el.props as { className: string }).className).toBe('resolved-class')
  })

  it('forwards the ref to the element', () => {
    const ref = { current: null }
    const el = render({
      runtime: makeRuntime(),
      props: {},
      ref,
      slotComponent,
      normalizeChildren: noopNormalize,
      filterProps: noopFilter,
      slotValidator: defaultValidator,
    })
    expect((el.props as { ref: unknown }).ref).toBe(ref)
  })

  it('passes dom-safe extra props to the element', () => {
    const el = render({
      runtime: makeRuntime(),
      props: { 'data-testid': 'box' },
      ref: null,
      slotComponent,
      normalizeChildren: noopNormalize,
      filterProps: noopFilter,
      slotValidator: defaultValidator,
    })
    expect((el.props as Record<string, unknown>)['data-testid']).toBe('box')
  })

  it('omits children from props when not provided', () => {
    const el = render({
      runtime: makeRuntime(),
      props: {},
      ref: null,
      slotComponent,
      normalizeChildren: noopNormalize,
      filterProps: noopFilter,
      slotValidator: defaultValidator,
    })
    expect('children' in (el.props as object)).toBe(false)
  })

  it('passes children when provided', () => {
    const child = createElement('span')
    const el = render({
      runtime: makeRuntime(),
      props: { children: child },
      ref: null,
      slotComponent,
      normalizeChildren: noopNormalize,
      filterProps: noopFilter,
      slotValidator: defaultValidator,
    })
    expect((el.props as { children: unknown }).children).toBe(child)
  })

  it('strips props that filterProps returns true for', () => {
    const el = render({
      runtime: makeRuntime(),
      props: { size: 'lg', 'data-keep': 'yes' },
      ref: null,
      slotComponent,
      normalizeChildren: noopNormalize,
      filterProps: (key) => key === 'size',
      slotValidator: defaultValidator,
    })
    const props = el.props as Record<string, unknown>
    expect(props['size']).toBeUndefined()
    expect(props['data-keep']).toBe('yes')
  })

  it('passes resolveAria the pre-filter normalized props, not the variant-stripped ones', () => {
    // Regression test: a component's own `enforcement.aria`/`enforcement.rules` custom rules
    // must be able to read a variant-only prop (e.g. a styling-only `size`) even though the
    // DOM-bound props passed as resolveAria's second argument have already had it stripped.
    const calls: Array<[unknown, Record<string, unknown> | undefined]> = []
    render({
      runtime: makeRuntime({
        resolveAria: (_tag, props, extraProps) => {
          calls.push([props, extraProps as Record<string, unknown> | undefined])
          return { props }
        },
      }),
      props: { size: 'lg', 'data-keep': 'yes' },
      ref: null,
      slotComponent,
      normalizeChildren: noopNormalize,
      filterProps: (key) => key === 'size',
      slotValidator: defaultValidator,
    })
    expect(calls).toHaveLength(1)
    const [domProps, extraProps] = calls[0] as [Record<string, unknown>, Record<string, unknown>]
    expect(domProps['size']).toBeUndefined()
    expect(extraProps['size']).toBe('lg')
    expect(extraProps['data-keep']).toBe('yes')
  })

  it('throws when as and asChild are both set', () => {
    expect(() =>
      render({
        runtime: makeRuntime(),
        props: { as: 'button', asChild: true },
        ref: null,
        slotComponent,
        normalizeChildren: noopNormalize,
        filterProps: noopFilter,
        slotValidator: defaultValidator,
      }),
    ).toThrow('Test: "as" and "asChild" are mutually exclusive')
  })

  it('throws when asChild has zero children', () => {
    expect(() =>
      render({
        runtime: makeRuntime(),
        props: { asChild: true, children: null },
        ref: null,
        slotComponent,
        normalizeChildren: () => [],
        filterProps: noopFilter,
        slotValidator: defaultValidator,
      }),
    ).toThrow('asChild requires a React element child')
  })

  it('throws when asChild has more than one child', () => {
    const kids = [createElement('span'), createElement('span')]
    expect(() =>
      render({
        runtime: makeRuntime(),
        props: { asChild: true, children: kids },
        ref: null,
        slotComponent,
        normalizeChildren: () => kids,
        filterProps: noopFilter,
        slotValidator: defaultValidator,
      }),
    ).toThrow('asChild requires exactly one React element child, got 2')
  })

  it('asChild with Slottable sibling pattern passes children through to Slot without throwing', () => {
    const sibling = createElement('span', { 'aria-hidden': true })
    const slottableEl = createElement(Slottable, null, createElement('a', { href: '/' }))
    const kids = [sibling, slottableEl]
    const el = render({
      runtime: makeRuntime(),
      props: { asChild: true, children: kids },
      ref: null,
      slotComponent,
      normalizeChildren: () => kids,
      filterProps: noopFilter,
      slotValidator: defaultValidator,
    })
    expect(el.type).toBe(slotComponent)
    const slotChildren = (el.props as { children: unknown }).children
    expect(Array.isArray(slotChildren)).toBe(true)
  })

  it('asChild path renders the slotComponent wrapping the child', () => {
    const child = createElement('button', { type: 'submit' })
    const el = render({
      runtime: makeRuntime(),
      props: { asChild: true, children: child },
      ref: null,
      slotComponent,
      normalizeChildren: () => [child],
      filterProps: noopFilter,
      slotValidator: defaultValidator,
    })
    expect(el.type).toBe(slotComponent)
    expect((el.props as { children: unknown }).children).toBe(child)
  })

  it('asChild path forwards className via slot props', () => {
    const runtime = makeRuntime({ resolveClasses: () => 'slot-class' })
    const child = createElement('button')
    const el = render({
      runtime,
      props: { asChild: true, children: child },
      ref: null,
      slotComponent,
      normalizeChildren: () => [child],
      filterProps: noopFilter,
      slotValidator: defaultValidator,
    })
    expect((el.props as { className: string }).className).toBe('slot-class')
  })

  it('recipe is forwarded to resolveClasses', () => {
    const resolveClasses = vi.fn(() => 'variant-class')
    const runtime = makeRuntime({ resolveClasses })
    render({
      runtime,
      props: { recipe: 'primary' },
      ref: null,
      slotComponent,
      normalizeChildren: noopNormalize,
      filterProps: noopFilter,
      slotValidator: defaultValidator,
    })
    expect(resolveClasses).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      undefined,
      'primary',
    )
  })

  it('warns when asChild receives a mixed array containing non-element children', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const child = createElement('button')
    render({
      runtime: makeRuntime({
        options: {
          defaultTag: 'div',
          variantKeys: new Set(),
          displayName: 'Test',
          diagnostics: warnDiagnostics,
        },
      }),
      props: { asChild: true, children: [child, 'click me'] },
      ref: null,
      slotComponent,
      // normalizeChildren strips the text node — child count shrinks from 2 to 1
      normalizeChildren: () => [child],
      filterProps: noopFilter,
      slotValidator: new SlotValidator('Test', warnDiagnostics, 'React element'),
    })
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('discarded 1 non-element child'))
    warnSpy.mockRestore()
  })

  it('does not warn about discarded children when strict is false', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const child = createElement('button')
    render({
      runtime: makeRuntime({
        options: {
          defaultTag: 'div',
          variantKeys: new Set(),
          displayName: 'Test',
          diagnostics: silentDiagnostics,
        },
      }),
      props: { asChild: true, children: [child, 'click me'] },
      ref: null,
      slotComponent,
      normalizeChildren: () => [child],
      filterProps: noopFilter,
      slotValidator: new SlotValidator('Test', silentDiagnostics, 'React element'),
    })
    expect(warnSpy).not.toHaveBeenCalled()
    warnSpy.mockRestore()
  })

  it('normalizeFn is called with merged props and its output reaches the DOM', () => {
    const normalize = vi.fn((p: Record<string, unknown>) => ({ ...p, 'data-normalized': 'yes' }))
    const el = render({
      runtime: makeRuntime({
        options: {
          defaultTag: 'div',
          variantKeys: new Set(),
          displayName: 'Test',
          diagnostics: silentDiagnostics,
          normalizeFn: normalize,
        },
      }),
      props: { 'data-input': 'x' },
      ref: null,
      slotComponent,
      normalizeChildren: noopNormalize,
      filterProps: noopFilter,
      slotValidator: defaultValidator,
    })
    expect(normalize).toHaveBeenCalledOnce()
    expect((el.props as Record<string, unknown>)['data-normalized']).toBe('yes')
  })

  it('runs HTML built-in normalizers before normalizeFn, letting normalizeFn see and override their output', () => {
    const seen: unknown[] = []
    const htmlNormalizer = (props: Record<string, unknown>) => ({
      ...props,
      'aria-disabled': 'true',
    })
    const normalize = vi.fn((props: Record<string, unknown>) => {
      seen.push(props['aria-disabled'])
      return { ...props, 'aria-disabled': 'overridden' }
    })
    const el = render({
      runtime: makeRuntime({
        options: {
          defaultTag: 'div',
          variantKeys: new Set(),
          displayName: 'Test',
          diagnostics: silentDiagnostics,
          normalizeFn: normalize,
          htmlPropNormalizersFn: () => [htmlNormalizer],
        },
      }),
      props: {},
      ref: null,
      slotComponent,
      normalizeChildren: noopNormalize,
      filterProps: noopFilter,
      slotValidator: defaultValidator,
    })
    // normalizeFn observed the HTML normalizer's output, then overrode it.
    expect(seen).toEqual(['true'])
    expect((el.props as Record<string, unknown>)['aria-disabled']).toBe('overridden')
  })

  it('normalizeFn is not called when absent', () => {
    expect(() =>
      render({
        runtime: makeRuntime(),
        props: {},
        ref: null,
        slotComponent,
        normalizeChildren: noopNormalize,
        filterProps: noopFilter,
        slotValidator: defaultValidator,
      }),
    ).not.toThrow()
  })

  it('childrenEvaluator receives non-empty text children (contract accessible-name path)', () => {
    // Regression for the finding where the React adapter's normalizeChildren stripped every
    // string child before contract evaluation, making labelContract's `accessible-name` rule
    // false-fire on the ordinary `<Label>Some text</Label>` case.
    const evaluate = vi.fn()
    const childrenEvaluator = { evaluate } as unknown as ChildrenEvaluator
    render({
      runtime: makeRuntime(),
      props: { children: 'Accept terms and conditions' },
      ref: null,
      slotComponent,
      normalizeChildren: realNormalizeChildren,
      filterProps: noopFilter,
      slotValidator: defaultValidator,
      childrenEvaluator,
    })
    expect(evaluate).toHaveBeenCalledWith(['Accept terms and conditions'], expect.anything())
  })

  it('asChild slot path still narrows to elements, ignoring sibling text', () => {
    const child = createElement('button', { type: 'submit' })
    const el = render({
      runtime: makeRuntime({
        options: {
          defaultTag: 'div',
          variantKeys: new Set(),
          displayName: 'Test',
          diagnostics: silentDiagnostics,
        },
      }),
      props: { asChild: true, children: ['keep me', child] },
      ref: null,
      slotComponent,
      normalizeChildren: realNormalizeChildren,
      filterProps: noopFilter,
      slotValidator: new SlotValidator('Test', silentDiagnostics, 'React element'),
    })
    expect(el.type).toBe(slotComponent)
    expect((el.props as { children: unknown }).children).toBe(child)
  })

  it('control props (as, asChild, className, recipe, children) are not forwarded to the DOM', () => {
    const el = render({
      runtime: makeRuntime(),
      props: { as: 'span', className: 'x', recipe: 'k', children: 'text' },
      ref: null,
      slotComponent,
      normalizeChildren: noopNormalize,
      filterProps: noopFilter,
      slotValidator: defaultValidator,
    })
    const props = el.props as Record<string, unknown>
    expect(props['as']).toBeUndefined()
    expect(props['asChild']).toBeUndefined()
    expect(props['recipe']).toBeUndefined()
  })
})
