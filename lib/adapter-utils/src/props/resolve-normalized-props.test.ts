import { describe, expect, it, vi } from 'vitest'
import type { NormalizeFn, PropNormalizer } from '@praxis-kit/core'
import { getHtmlPropNormalizers } from '@praxis-kit/core'
import { resolveNormalizedProps } from './resolve-normalized-props'

// Mirrors what resolveFactoryOptions stores on the resolved runtime options.
const htmlPropNormalizersFn = (tag: unknown) => getHtmlPropNormalizers(tag)

describe('resolveNormalizedProps — no work to do', () => {
  it('returns the input object by reference when no HTML normalizers and no normalizeFn', () => {
    const props = { disabled: true, className: 'btn' }
    expect(resolveNormalizedProps({ htmlPropNormalizersFn }, 'div', props)).toBe(props)
  })

  it('returns the input by reference for an unknown tag', () => {
    const props = { foo: 1 }
    expect(resolveNormalizedProps({ htmlPropNormalizersFn }, 'my-element', props)).toBe(props)
  })

  it('never mutates the input', () => {
    const props = { disabled: true }
    resolveNormalizedProps({ htmlPropNormalizersFn }, 'button', props)
    expect(props).toEqual({ disabled: true })
  })
})

describe('resolveNormalizedProps — HTML built-ins', () => {
  it('applies disabledProps on button', () => {
    const r = resolveNormalizedProps({ htmlPropNormalizersFn }, 'button', { disabled: true })
    expect(r['aria-disabled']).toBe('true')
    expect(r['data-disabled']).toBe('')
  })

  it('applies every applicable normalizer on input', () => {
    const r = resolveNormalizedProps({ htmlPropNormalizersFn }, 'input', {
      disabled: true,
      readOnly: true,
      invalid: true,
    })
    expect(r['aria-disabled']).toBe('true')
    expect(r['aria-readonly']).toBe('true')
    expect(r['aria-invalid']).toBe('true')
  })
})

describe('resolveNormalizedProps — ordering (the canonical contract)', () => {
  it('runs HTML built-ins before normalizeFn', () => {
    const seen: Array<string | undefined> = []
    const normalizeFn = ((props: Record<string, unknown>) => {
      seen.push(props['aria-disabled'] as string | undefined)
      return props
    }) as NormalizeFn
    resolveNormalizedProps({ htmlPropNormalizersFn, normalizeFn }, 'button', { disabled: true })
    expect(seen).toEqual(['true'])
  })

  it("lets the caller's normalizeFn override an HTML built-in for the same key", () => {
    const normalizeFn = ((props: Record<string, unknown>) => ({
      ...props,
      'aria-disabled': 'false',
    })) as NormalizeFn
    const r = resolveNormalizedProps({ htmlPropNormalizersFn, normalizeFn }, 'button', {
      disabled: true,
    })
    expect(r['aria-disabled']).toBe('false')
  })

  it('applies normalizeFn even when there are no HTML normalizers for the tag', () => {
    const normalizeFn = ((props: Record<string, unknown>) => ({
      ...props,
      seen: true,
    })) as NormalizeFn
    const r = resolveNormalizedProps({ htmlPropNormalizersFn, normalizeFn }, 'div', {})
    expect(r['seen']).toBe(true)
  })
})

describe('resolveNormalizedProps — allocation', () => {
  it('copies the input exactly once when HTML normalizers run (accumulator, not per-fn spread)', () => {
    // input + one copy; each normalizer Object.assigns onto that copy in place.
    const props = { disabled: true, readOnly: true }
    const r = resolveNormalizedProps({ htmlPropNormalizersFn }, 'input', props)
    expect(r).not.toBe(props)
  })

  it('does not run normalizeFn work when it is absent', () => {
    const htmlNormalizer = vi.fn<PropNormalizer>(() => ({}))
    resolveNormalizedProps({ htmlPropNormalizersFn: () => [htmlNormalizer] }, 'button', {
      disabled: true,
    })
    expect(htmlNormalizer).toHaveBeenCalledTimes(1)
  })
})
