import { describe, expect, it } from 'vitest'

import {
  createRemoveAttributeRule,
  invalidWithFix,
  invalidWithoutFix,
  removeAttributeFix,
} from './factories'
import { AriaPolicyEngine } from './polymorphic-validator'
import { DiagnosticCategory, DiagnosticCode, silentDiagnostics } from '@praxis-kit/diagnostics'

import type { AriaContext } from '../types'

function context(props: AriaContext['props']): AriaContext {
  return { tag: 'a', implicitRole: undefined, effectiveRole: undefined, props }
}

// ── invalidWithoutFix ──────────────────────────────────────────────────────────

describe('invalidWithoutFix', () => {
  it('returns valid: false, fixable: false, with the given severity', () => {
    expect(invalidWithoutFix({ severity: 'warning' })).toEqual({
      valid: false,
      fixable: false,
      severity: 'warning',
    })
  })

  it('includes attribute/message/diagnostic only when provided', () => {
    const diagnostic = {
      code: DiagnosticCode.AriaViolation,
      category: DiagnosticCategory.ARIA,
      message: 'bad',
    }
    const result = invalidWithoutFix({
      severity: 'error',
      attribute: 'role',
      message: 'redundant role',
      diagnostic,
    })
    expect(result).toEqual({
      valid: false,
      fixable: false,
      severity: 'error',
      attribute: 'role',
      message: 'redundant role',
      diagnostic,
    })
  })

  // The exact widening bug this factory exists to route around: extracting a
  // shared severity/attribute pair into a plain object and spreading it across
  // two branches silently drops the discriminant otherwise.
  it('stays correctly typed when severity is extracted into a shared local first', () => {
    const shared = { severity: 'warning' as const, attribute: 'role' }
    const a = invalidWithoutFix({ ...shared, message: 'first' })
    const b = invalidWithoutFix({ ...shared, message: 'second' })
    expect(a.fixable).toBe(false)
    expect(b.fixable).toBe(false)
  })
})

// ── invalidWithFix ─────────────────────────────────────────────────────────────

describe('invalidWithFix', () => {
  it('returns valid: false, fixable: true, with the given fix', () => {
    const fix = removeAttributeFix('role')
    const result = invalidWithFix({ severity: 'warning', fix })
    expect(result).toEqual({
      valid: false,
      fixable: true,
      severity: 'warning',
      fix,
    })
  })
})

// ── removeAttributeFix ─────────────────────────────────────────────────────────

describe('removeAttributeFix', () => {
  it('is a no-op when the attribute is absent', () => {
    const fix = removeAttributeFix('role')
    const props = { href: '/x' }
    const result = fix.apply(context(props))
    expect(result).toEqual({ applied: false, next: props })
  })

  it('strips the attribute when present, without mutating the original props', () => {
    const fix = removeAttributeFix('role')
    const props = { href: '/x', role: 'button' }
    const result = fix.apply(context(props))
    expect(result.applied).toBe(true)
    expect(result).toMatchObject({ next: { href: '/x' }, previous: props })
    expect(result.next).not.toHaveProperty('role')
    expect(props).toHaveProperty('role') // original untouched
  })

  it('sets kind to "removeAttribute" and attribute to the target attribute name', () => {
    const fix = removeAttributeFix('role')
    expect(fix.kind).toBe('removeAttribute')
    expect(fix.attribute).toBe('role')
  })

  it('is frozen — a fix is a value object, not mutable after construction', () => {
    const fix = removeAttributeFix('role')
    expect(Object.isFrozen(fix)).toBe(true)
    expect(() => {
      ;(fix as { kind: string }).kind = 'banana'
    }).toThrow(TypeError)
  })
})

// ── createRemoveAttributeRule ────────────────────────────────────────────────────

describe('createRemoveAttributeRule', () => {
  it('produces no results when `when` returns false', () => {
    const rule = createRemoveAttributeRule('href', { when: () => false })
    expect(rule(context({ href: 'javascript:alert(1)' }))).toEqual([])
  })

  it('produces a fixable result targeting the given attribute when `when` returns true', () => {
    const rule = createRemoveAttributeRule('href', { when: () => true })
    const [result] = rule(context({ href: 'javascript:alert(1)' }))
    expect(result).toMatchObject({ valid: false, fixable: true, attribute: 'href' })
  })

  it('defaults severity to "warning"', () => {
    const rule = createRemoveAttributeRule('href', { when: () => true })
    const [result] = rule(context({}))
    expect(result).toMatchObject({ severity: 'warning' })
  })

  it('honors an explicit severity', () => {
    const rule = createRemoveAttributeRule('href', { when: () => true, severity: 'error' })
    const [result] = rule(context({}))
    expect(result).toMatchObject({ severity: 'error' })
  })

  it('passes the triggering context into the diagnostic builder', () => {
    const rule = createRemoveAttributeRule('href', {
      when: () => true,
      diagnostic: (ctx) => ({
        code: DiagnosticCode.AriaViolation,
        category: DiagnosticCategory.ARIA,
        message: `bad on ${ctx.tag}`,
      }),
    })
    const [result] = rule(context({}))
    expect(result).toMatchObject({ diagnostic: { message: 'bad on a' } })
  })

  it('the produced fix actually removes the attribute', () => {
    const rule = createRemoveAttributeRule('href', { when: () => true })
    const [result] = rule(context({ href: 'javascript:alert(1)' }))
    if (!result || result.valid || !result.fixable) throw new Error('expected a fixable result')
    const fixResult = result.fix.apply(context({ href: 'javascript:alert(1)' }))
    expect(fixResult.next).not.toHaveProperty('href')
  })

  it('carries readsProps/tags through onto the returned rule when provided', () => {
    const rule = createRemoveAttributeRule('href', {
      when: () => false,
      readsProps: ['href'],
      tags: ['a'],
    })
    expect(rule.readsProps).toEqual(['href'])
    expect(rule.tags).toEqual(['a'])
  })

  it('omits readsProps/tags from the returned rule when not provided', () => {
    const rule = createRemoveAttributeRule('href', { when: () => false })
    expect(rule.readsProps).toBeUndefined()
    expect(rule.tags).toBeUndefined()
  })

  // Integration: the exact dangerousHrefRule shape from the downstream finding this
  // factory addresses, wired through the real engine end to end — no `as const`
  // needed anywhere, unlike the hand-rolled custom-rule tests elsewhere in this file.
  it('integrates with AriaPolicyEngine: fires and auto-applies the fix', () => {
    const dangerousHrefRule = createRemoveAttributeRule('href', {
      when: (ctx) => typeof ctx.props.href === 'string' && ctx.props.href.startsWith('javascript:'),
      severity: 'error',
      message: 'dangerous URL scheme',
      readsProps: ['href'],
    })
    const engine = new AriaPolicyEngine(silentDiagnostics, { rules: [dangerousHrefRule] })
    const { violations, props } = engine.validate('a', { href: 'javascript:alert(1)' } as never)
    expect(violations.some((v) => v.message === 'dangerous URL scheme')).toBe(true)
    expect(props).not.toHaveProperty('href')
  })
})
