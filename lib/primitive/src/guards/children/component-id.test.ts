import { describe, it, expect } from 'vitest'
import {
  COMPONENT_DEFAULT_TAG,
  createComponentId,
  getComponentDefaultTag,
  markComponentTag,
} from './component-id'
import { getTag, isTag } from './is-tag'

// ── createComponentId ─────────────────────────────────────────────────────────

describe('createComponentId', () => {
  it('returns the same symbol for the same name', () => {
    expect(createComponentId('Image')).toBe(createComponentId('Image'))
  })

  it('returns different symbols for different names', () => {
    expect(createComponentId('Image')).not.toBe(createComponentId('Icon'))
  })
})

// ── markComponentTag ───────────────────────────────────────────────────────────

describe('markComponentTag', () => {
  it('returns the same object reference it was given', () => {
    function Wrapper() {}
    expect(markComponentTag(Wrapper, 'source')).toBe(Wrapper)
  })

  it('stamps COMPONENT_DEFAULT_TAG so getComponentDefaultTag reads it back', () => {
    function Wrapper() {}
    markComponentTag(Wrapper, 'source')
    expect(getComponentDefaultTag(Wrapper)).toBe('source')
  })

  it('stamps a non-enumerable property — a spread of the marked object omits it', () => {
    const marked = markComponentTag({}, 'source')
    expect({ ...marked }).toEqual({})
    expect(Object.keys(marked)).toEqual([])
  })

  it('rejects a plain-assignment overwrite of an already-marked object', () => {
    function Wrapper() {}
    markComponentTag(Wrapper, 'source')
    expect(() => {
      ;(Wrapper as unknown as Record<symbol, unknown>)[COMPONENT_DEFAULT_TAG] = 'picture'
    }).toThrow(TypeError)
    expect(getComponentDefaultTag(Wrapper)).toBe('source')
  })

  it('allows re-marking the same object through markComponentTag itself', () => {
    function Wrapper() {}
    markComponentTag(Wrapper, 'source')
    markComponentTag(Wrapper, 'picture')
    expect(getComponentDefaultTag(Wrapper)).toBe('picture')
  })

  it('marks a plain object the same way as a function', () => {
    const marked = markComponentTag({}, 'img')
    expect(getComponentDefaultTag(marked)).toBe('img')
  })
})

// ── getComponentDefaultTag ──────────────────────────────────────────────────────

describe('getComponentDefaultTag', () => {
  it('returns undefined for a function with no COMPONENT_DEFAULT_TAG', () => {
    expect(getComponentDefaultTag(function Plain() {})).toBeUndefined()
  })

  it('returns undefined for non-object, non-function values', () => {
    expect(getComponentDefaultTag(null)).toBeUndefined()
    expect(getComponentDefaultTag(undefined)).toBeUndefined()
    expect(getComponentDefaultTag('source')).toBeUndefined()
    expect(getComponentDefaultTag(42)).toBeUndefined()
  })
})

// ── integration: the finding #19 repro — a transparent wrapper regains recognition ──

describe('markComponentTag + isTag()/getTag() — wrapper recognition', () => {
  it('a wrapper function is unrecognized by isTag() before marking', () => {
    function SourceImpl() {}
    Object.assign(SourceImpl, { [COMPONENT_DEFAULT_TAG]: 'source' })
    function Wrapper() {
      return SourceImpl
    }
    const unmarkedChild = { type: Wrapper }
    expect(isTag('source')(unmarkedChild)).toBe(false)
    expect(getTag(unmarkedChild)).toBeUndefined()
  })

  it('markComponentTag makes the wrapper recognized identically to the original', () => {
    function SourceImpl() {}
    Object.assign(SourceImpl, { [COMPONENT_DEFAULT_TAG]: 'source' })
    function Wrapper() {
      return SourceImpl
    }
    markComponentTag(Wrapper, 'source')
    const markedChild = { type: Wrapper }
    expect(isTag('source')(markedChild)).toBe(true)
    expect(getTag(markedChild)).toBe('source')
  })
})
