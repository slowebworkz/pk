// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest'
import { createElement, Fragment, createRef } from 'react'
import type { RenderCallbackProps } from '../shared'
import { warnDiagnostics, throwDiagnostics } from '@praxis-kit/diagnostics'
import type { AriaRule } from '@praxis-kit/core/contract'
import { box, useReactDom } from '../shared/test-utils'
import { createContractComponent } from './create-contract-component'

const dom = useReactDom()

describe('createContractComponent (current / React 19)', () => {
  it('sets displayName', () => {
    const Comp = createContractComponent({ name: 'MyBox' })

    expect(Comp.displayName).toBe('MyBox')
  })

  it('falls back to PolymorphicComponent displayName', () => {
    const Comp = createContractComponent({})

    expect(Comp.displayName).toBe('PolymorphicComponent')
  })

  it('renders the default tag (div)', () => {
    const Box = createContractComponent({})

    dom.mount(createElement(box(Box), null))

    expect(dom.container.querySelector('div')).toBeTruthy()
  })

  it('renders a different tag via the as prop', () => {
    const Box = createContractComponent({})

    dom.mount(createElement(box(Box), { as: 'section' }))

    expect(dom.container.querySelector('section')).toBeTruthy()
    expect(dom.container.querySelector('div')).toBeNull()
  })

  it('applies baseClassName', () => {
    const Box = createContractComponent({
      styling: { base: 'base-cls' },
    })

    dom.mount(createElement(box(Box), null))

    expect(dom.container.querySelector('div')!.className).toBe('base-cls')
  })

  it('merges caller className with base', () => {
    const Box = createContractComponent({
      styling: { base: 'base' },
    })

    dom.mount(createElement(box(Box), { className: 'extra' }))

    const cls = dom.container.querySelector('div')!.className

    expect(cls).toContain('base')
    expect(cls).toContain('extra')
  })

  it('forwards a ref to the DOM element', () => {
    const Box = createContractComponent({})
    const ref = createRef<HTMLDivElement>()

    dom.mount(createElement(box(Box), { ref }))

    expect(ref.current).toBe(dom.container.querySelector('div'))
  })

  it('forwards a ref when rendered as a different tag', () => {
    const Box = createContractComponent({})
    const ref = createRef<HTMLButtonElement>()

    dom.mount(createElement(box(Box), { as: 'button', ref }))

    expect(ref.current).toBe(dom.container.querySelector('button'))
  })

  it('passes extra props to the DOM element', () => {
    const Box = createContractComponent({})

    dom.mount(
      createElement(box(Box), {
        'data-testid': 'box',
      }),
    )

    expect(dom.container.querySelector('[data-testid="box"]')).toBeTruthy()
  })

  it('renders children', () => {
    const Box = createContractComponent({})

    dom.mount(createElement(box(Box), null, createElement('span', { id: 'child' })))

    expect(dom.container.querySelector('span#child')).toBeTruthy()
  })

  it('asChild renders the child element type instead of the default tag', () => {
    const Box = createContractComponent({})

    dom.mount(
      createElement(box(Box), { asChild: true }, createElement('button', { type: 'button' })),
    )

    expect(dom.container.querySelector('button')).toBeTruthy()
    expect(dom.container.querySelector('div')).toBeNull()
  })

  it('asChild merges className onto the child element', () => {
    const Box = createContractComponent({
      styling: { base: 'box-cls' },
    })

    dom.mount(createElement(box(Box), { asChild: true }, createElement('button')))

    expect(dom.container.querySelector('button')!.className).toContain('box-cls')
  })

  it('asChild throws when given zero children', () => {
    const Box = createContractComponent({})

    expect(() =>
      dom.mount(
        createElement(box(Box), {
          asChild: true,
        }),
      ),
    ).toThrow('asChild requires a React element child')
  })

  // Fragment is NOT flattened in current/ — it counts as one element.
  // asChild with a Fragment child is valid (one element), but Slot receives
  // the Fragment as the child, which is then treated as one slot child.
  it('fragment child counts as one element for asChild (no flattening)', () => {
    const Box = createContractComponent({})

    const fragment = createElement(Fragment, null, createElement('span'))

    // Should not throw — exactly one "element" (the Fragment) is passed
    expect(() => dom.mount(createElement(box(Box), { asChild: true }, fragment))).not.toThrow()
  })

  it('nested asChild: both components compose their classes onto the inner element', () => {
    const BoxA = createContractComponent({
      styling: { base: 'class-a' },
    })

    const BoxB = createContractComponent({
      styling: { base: 'class-b' },
    })

    dom.mount(
      createElement(
        box(BoxA),
        { asChild: true },
        createElement(box(BoxB), { asChild: true }, createElement('button')),
      ),
    )

    const el = dom.container.querySelector('button')!

    expect(el.className).toContain('class-a')
    expect(el.className).toContain('class-b')
  })

  it('nested asChild: ref from outer component reaches the innermost element', () => {
    const BoxA = createContractComponent({})
    const BoxB = createContractComponent({})
    const ref = createRef<HTMLButtonElement>()

    dom.mount(
      createElement(
        box(BoxA),
        { asChild: true, ref },
        createElement(box(BoxB), { asChild: true }, createElement('button')),
      ),
    )

    expect(ref.current).toBe(dom.container.querySelector('button'))
  })

  it('applies filterProps — strips matching keys before DOM forwarding', () => {
    const Box = createContractComponent({
      filterProps: (key: string) => key === 'size',
    })

    dom.mount(
      createElement(box(Box), {
        size: 'lg',
        'data-keep': 'yes',
      } as never),
    )

    const el = dom.container.querySelector('div')!

    expect(el.getAttribute('size')).toBeNull()
    expect(el.getAttribute('data-keep')).toBe('yes')
  })

  // ── render prop ────────────────────────────────────────────────────────────

  it('render prop: renders the element returned by the callback', () => {
    const Box = createContractComponent({ tag: 'div' })

    dom.mount(
      createElement(box(Box), {
        render: () => createElement('a', { href: '/' }, 'link'),
      }),
    )

    expect(dom.container.querySelector('a')).toBeTruthy()
    expect(dom.container.querySelector('div')).toBeNull()
  })

  it('render prop: passes resolved className to the callback', () => {
    const Box = createContractComponent({
      tag: 'div',
      styling: { base: 'box-cls' },
    })

    dom.mount(
      createElement(box(Box), {
        render: (p: RenderCallbackProps) => createElement('a', p as never),
      }),
    )

    expect(dom.container.querySelector('a')!.className).toContain('box-cls')
  })

  it('render prop: passes variant-resolved className to the callback', () => {
    const Button = createContractComponent({
      tag: 'button',
      styling: {
        base: 'btn',
        variants: { size: { lg: 'btn--lg' } },
        defaults: { size: 'lg' },
      },
    })

    dom.mount(
      createElement(box(Button), {
        render: (p: RenderCallbackProps) => createElement('a', p as never),
      }),
    )

    expect(dom.container.querySelector('a')!.className).toContain('btn--lg')
  })

  it('render prop: does not forward the render key as a DOM attribute', () => {
    const Box = createContractComponent({ tag: 'div' })

    dom.mount(
      createElement(box(Box), {
        render: (p: RenderCallbackProps) => createElement('a', p as never),
      }),
    )

    const el = dom.container.querySelector('a')!
    expect(el.hasAttribute('render')).toBe(false)
  })

  it('render prop: passes ref to the callback so the caller can forward it', () => {
    const Box = createContractComponent({ tag: 'div' })
    const ref = createRef<HTMLAnchorElement>()

    dom.mount(
      createElement(box(Box), {
        ref,
        render: (p: RenderCallbackProps) => createElement('a', { ...p, href: '/' } as never),
      }),
    )

    expect(ref.current).toBe(dom.container.querySelector('a'))
  })

  it('render prop: takes priority over asChild when both are present', () => {
    // asChild is stripped by the discriminated union; providing render takes the render path.
    const Box = createContractComponent({ tag: 'div', styling: { base: 'box-cls' } })

    dom.mount(
      createElement(box(Box), {
        render: (p: RenderCallbackProps) => createElement('section', p as never),
      }),
    )

    expect(dom.container.querySelector('section')).toBeTruthy()
    expect(dom.container.querySelector('div')).toBeNull()
  })

  it('render prop: forwards non-variant DOM props (e.g. data-testid) through callback', () => {
    const Box = createContractComponent({ tag: 'div' })
    const received: Record<string, unknown> = {}

    dom.mount(
      createElement(box(Box), {
        'data-testid': 'my-box',
        render: (p: RenderCallbackProps) => {
          Object.assign(received, p)
          return createElement('a', p as never)
        },
      } as never),
    )

    expect(received['data-testid']).toBe('my-box')
  })

  // ── allowedAs enforcement ───────────────────────────────────────────────────

  it('allowedAs: does not warn when as matches the allowed list', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const Box = createContractComponent({
      enforcement: { diagnostics: warnDiagnostics, allowedAs: ['button', 'a'] },
    })

    dom.mount(createElement(box(Box), { as: 'button' }))

    expect(warn).not.toHaveBeenCalled()
    warn.mockRestore()
  })

  it('allowedAs: warns when as does not match the allowed list (strict: warn)', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const Box = createContractComponent({
      enforcement: { diagnostics: warnDiagnostics, allowedAs: ['button', 'a'] },
    })

    dom.mount(createElement(box(Box), { as: 'div' }))

    expect(warn).toHaveBeenCalledWith(expect.stringContaining('"div"'))
    warn.mockRestore()
  })

  it('allowedAs: throws when as does not match the allowed list (strict: throw)', () => {
    const Box = createContractComponent({
      enforcement: { diagnostics: throwDiagnostics, allowedAs: ['button', 'a'] },
    })

    expect(() => dom.mount(createElement(box(Box), { as: 'div' }))).toThrow(/"div"/)
  })

  // React's adapter default is throwDiagnostics (resolveAdapterCommonOptions), so omitting
  // enforcement.diagnostics entirely must behave the same as explicitly setting throwDiagnostics —
  // not silently accept the violation.
  it('allowedAs: throws by default (no enforcement.diagnostics override) when as does not match', () => {
    const Box = createContractComponent({
      enforcement: { allowedAs: ['button', 'a'] },
    })

    expect(() => dom.mount(createElement(box(Box), { as: 'div' }))).toThrow(/"div"/)
  })

  // ── custom aria rule enforcement ────────────────────────────────────────────

  it('aria: throws by default (no enforcement.diagnostics override) on a severity: "error" violation', () => {
    const rejectRoleButton: AriaRule = ({ props }) =>
      props.role === 'button'
        ? [{ valid: false, severity: 'error', fixable: false, message: 'role=button not allowed' }]
        : [{ valid: true }]
    // eslint-disable-next-line @praxis-kit/no-enforcement-without-strict -- intentionally omitted: this test verifies the adapter's default (unset diagnostics) throws.
    const Box = createContractComponent({
      enforcement: { aria: [rejectRoleButton] },
    })

    expect(() => dom.mount(createElement(box(Box), { role: 'button' } as never))).toThrow(
      /role=button not allowed/,
    )
  })

  // ── normalize ───────────────────────────────────────────────────────────────

  it('normalize: callback fires and its return value replaces props', () => {
    const Box = createContractComponent({
      normalize: (props) => ({ ...props, 'data-normalized': 'yes' }),
    })

    dom.mount(createElement(box(Box), null))

    expect(dom.container.querySelector('[data-normalized="yes"]')).toBeTruthy()
  })

  it('normalize: can remove a prop before it reaches the DOM', () => {
    const Box = createContractComponent({
      normalize: ({ unwanted: _, ...rest }) => rest,
    })

    dom.mount(createElement(box(Box), { unwanted: 'bad' } as never))

    expect(dom.container.querySelector('[unwanted]')).toBeNull()
  })

  // ── HTML prop normalizers ────────────────────────────────────────────────────

  it('prop normalizers: disabled on button adds aria-disabled and data-disabled', () => {
    const Btn = createContractComponent({ tag: 'button' })
    dom.mount(createElement(box(Btn), { disabled: true } as never))
    const el = dom.container.querySelector('button')!
    expect(el.getAttribute('aria-disabled')).toBe('true')
    expect(el.getAttribute('data-disabled')).toBe('')
  })

  it('prop normalizers: does not add aria-disabled when disabled is false', () => {
    const Btn = createContractComponent({ tag: 'button' })
    dom.mount(createElement(box(Btn), { disabled: false } as never))
    const el = dom.container.querySelector('button')!
    expect(el.getAttribute('aria-disabled')).toBeNull()
  })

  it('prop normalizers: disabled on non-form element does not add aria-disabled', () => {
    const Box = createContractComponent({ tag: 'div' })
    dom.mount(createElement(box(Box), { disabled: true } as never))
    const el = dom.container.querySelector('div')!
    expect(el.getAttribute('aria-disabled')).toBeNull()
  })

  it('prop normalizers: explicit aria-disabled is not overridden', () => {
    const Btn = createContractComponent({ tag: 'button' })
    dom.mount(createElement(box(Btn), { disabled: true, 'aria-disabled': 'false' } as never))
    const el = dom.container.querySelector('button')!
    expect(el.getAttribute('aria-disabled')).toBe('false')
  })

  it('prop normalizers: enforcement.props normalizer fires after HTML built-ins', () => {
    const seenAriaDisabled: Array<string | undefined> = []
    const Btn = createContractComponent({
      tag: 'button',
      enforcement: {
        props: [
          (props) => {
            seenAriaDisabled.push(props['aria-disabled'] as string | undefined)
            return {}
          },
        ],
      },
    })
    dom.mount(createElement(box(Btn), { disabled: true } as never))
    expect(seenAriaDisabled).toEqual(['true'])
  })

  it('prop normalizers: enforcement.props normalizer can override built-in', () => {
    const Btn = createContractComponent({
      tag: 'button',
      enforcement: {
        props: [() => ({ 'aria-disabled': 'false' })],
      },
    })
    dom.mount(createElement(box(Btn), { disabled: true } as never))
    const el = dom.container.querySelector('button')!
    expect(el.getAttribute('aria-disabled')).toBe('false')
  })

  it('prop normalizers: normalize callback sees already-patched props', () => {
    const seenAriaDisabled: Array<string | undefined> = []
    const Btn = createContractComponent({
      tag: 'button',
      normalize: (props) => {
        seenAriaDisabled.push(props['aria-disabled'] as string | undefined)
        return props
      },
    })
    dom.mount(createElement(box(Btn), { disabled: true } as never))
    expect(seenAriaDisabled).toEqual(['true'])
  })

  // ── HTML contract uses active tag ────────────────────────────────────────────

  it('html contract: evaluates against the active tag, not the default tag', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    // Picture requires specific children (source*, img); evaluate against 'ul' which has no contract
    // Using 'ul' as default but rendering as 'picture' — the picture contract should fire
    const Pic = createContractComponent({ tag: 'ul' })

    // 'picture' requires img as last child; passing a div should trigger a warning
    dom.mount(createElement(box(Pic), { as: 'picture' }, createElement('div')))

    // Warning expected because <picture> children contract fires for the active 'picture' tag
    expect(warn).toHaveBeenCalled()
    warn.mockRestore()
  })

  it('html contract: skipped for a valid asChild composition (no false "unexpected child")', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    // <button> is a closed contract that rejects interactive/opaque children. With asChild,
    // Trigger's props merge onto the inner element and no <button> of Trigger's own is
    // rendered, so the contract must not evaluate the pre-merge child.
    const Trigger = createContractComponent({ tag: 'button', name: 'Trigger' })
    const Inner = createContractComponent({ tag: 'button', name: 'Inner' })

    dom.mount(
      createElement(box(Trigger), { asChild: true }, createElement(box(Inner), null, 'Filters')),
    )

    expect(warn).not.toHaveBeenCalled()
    warn.mockRestore()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })
})
