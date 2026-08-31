import { describe, it, expect } from 'vitest'
import { createElement, Fragment } from 'react'
import { normalizeChildren } from './normalize-children'

describe('normalizeChildren (current / React 19)', () => {
  it('returns [] for null', () => {
    expect(normalizeChildren(null)).toEqual([])
  })

  it('returns [] for undefined', () => {
    expect(normalizeChildren(undefined)).toEqual([])
  })

  it('preserves a non-empty string child', () => {
    expect(normalizeChildren('Accept terms and conditions')).toEqual([
      'Accept terms and conditions',
    ])
  })

  it('drops a whitespace-only string child', () => {
    expect(normalizeChildren('   ')).toEqual([])
  })

  it('preserves a number child', () => {
    expect(normalizeChildren(42)).toEqual([42])
  })

  it('returns [element] for a single valid React element', () => {
    const el = createElement('span')
    const result = normalizeChildren(el)
    expect(result).toHaveLength(1)
    expect(result[0]).toBe(el)
  })

  it('returns elements from a flat array', () => {
    const a = createElement('span')
    const b = createElement('div')
    const result = normalizeChildren([a, b])
    expect(result).toHaveLength(2)
    expect(result[0]).toBe(a)
    expect(result[1]).toBe(b)
  })

  it('keeps elements and non-empty text, dropping null/booleans from a mixed array', () => {
    const el = createElement('span')
    const result = normalizeChildren([el, 'text', null, 42, false, '  '])
    expect(result).toEqual([el, 'text', 42])
  })

  it('returns [] for an empty array', () => {
    expect(normalizeChildren([])).toEqual([])
  })

  // Key behavioral difference from legacy: Fragments are NOT traversed.
  // A Fragment passed as the sole child is treated as one element, not flattened.
  it('treats a Fragment as a single element — does NOT flatten its children', () => {
    const inner = createElement('span')
    const fragment = createElement(Fragment, null, inner)
    const result = normalizeChildren(fragment)
    expect(result).toHaveLength(1)
    expect(result[0]).toBe(fragment)
  })

  it('returns the fragment for a fragment passed inside an array', () => {
    const fragment = createElement(Fragment, null, createElement('span'))
    // Fragment IS a valid React element, so it passes isValidElement
    const result = normalizeChildren([fragment])
    expect(result).toHaveLength(1)
    expect(result[0]).toBe(fragment)
  })
})
