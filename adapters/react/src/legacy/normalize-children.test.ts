import { describe, it, expect } from 'vitest'
import { createElement, Fragment, isValidElement } from 'react'
import { normalizeChildren } from './normalize-children'

// Children.toArray clones every element to re-key it, so identity (`toBe`) checks
// don't hold — assert on `.type` instead, as the pre-existing tests did.
const typeOf = (child: unknown): unknown => (isValidElement(child) ? child.type : child)

describe('normalizeChildren (legacy / React 18)', () => {
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
    const result = normalizeChildren(createElement('span'))
    expect(result).toHaveLength(1)
    expect(typeOf(result[0])).toBe('span')
  })

  it('returns elements from a flat array', () => {
    const result = normalizeChildren([createElement('span'), createElement('div')])
    expect(result.map(typeOf)).toEqual(['span', 'div'])
  })

  it('keeps elements and non-empty text, dropping null/booleans from a mixed array', () => {
    const result = normalizeChildren([createElement('span'), 'text', null, 42, false, '  '])
    expect(result.map(typeOf)).toEqual(['span', 'text', 42])
  })

  it('returns [] for an empty array', () => {
    expect(normalizeChildren([])).toEqual([])
  })

  // Note: Children.toArray no longer traverses Fragment boundaries in React 19 —
  // Fragments are returned as opaque elements, identical to the current/ implementation.
  it('does NOT flatten Fragment children (same as current/)', () => {
    const fragment = createElement(Fragment, null, createElement('span'))
    const result = normalizeChildren(fragment)
    expect(result).toHaveLength(1)
    expect(typeOf(result[0])).toBe(Fragment)
  })

  it('treats a Fragment with multiple children as one element', () => {
    const fragment = createElement(Fragment, null, createElement('span'), createElement('div'))
    const result = normalizeChildren(fragment)
    expect(result).toHaveLength(1)
    expect(typeOf(result[0])).toBe(Fragment)
  })
})
