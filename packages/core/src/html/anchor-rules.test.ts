import { DiagnosticCode } from '@praxis-kit/diagnostics'
import { describe, expect, it } from 'vitest'

import type { AriaContext, AriaRule } from '../types'
import {
  ANCHOR_RULES,
  ariaDisabledInertRule,
  dangerousHrefRule,
  roleButtonWithHrefRule,
} from './anchor-rules'

function ctx(props: Record<string, unknown>, tag = 'a'): AriaContext {
  return {
    tag: tag as AriaContext['tag'],
    props,
    implicitRole: undefined,
    effectiveRole: undefined,
    variantKeys: new Set(),
  }
}

function expectRuleMetadata(
  rule: AriaRule,
  readsProps: readonly string[],
  tags: readonly string[],
): void {
  expect(rule.readsProps).toEqual(readsProps)
  expect(rule.tags).toEqual(tags)
}

describe('dangerousHrefRule', () => {
  it('flags a javascript: href', () => {
    const [result] = dangerousHrefRule(ctx({ href: 'javascript:alert(1)' }))
    expect(result).toMatchObject({ valid: false, severity: 'warning', fixable: true })
    if (!result || result.valid) throw new Error('expected a violation')
    expect(result.diagnostic?.code).toBe(DiagnosticCode.HtmlAnchorDangerousHref)
  })

  it('flags a data: href', () => {
    const [result] = dangerousHrefRule(ctx({ href: 'data:text/html,<script>alert(1)</script>' }))
    expect(result).toMatchObject({ valid: false, severity: 'warning', fixable: true })
  })

  it('flags a vbscript: href', () => {
    const [result] = dangerousHrefRule(ctx({ href: 'vbscript:msgbox(1)' }))
    expect(result).toMatchObject({ valid: false, severity: 'warning', fixable: true })
  })

  it('is case-insensitive', () => {
    const [result] = dangerousHrefRule(ctx({ href: 'JavaScript:alert(1)' }))
    expect(result).toMatchObject({ valid: false })
  })

  it('catches whitespace/control-character scheme evasion', () => {
    expect(dangerousHrefRule(ctx({ href: 'java\tscript:alert(1)' }))[0]).toMatchObject({
      valid: false,
    })
    expect(dangerousHrefRule(ctx({ href: 'java\nscript:alert(1)' }))[0]).toMatchObject({
      valid: false,
    })
    expect(dangerousHrefRule(ctx({ href: 'java\rscript:alert(1)' }))[0]).toMatchObject({
      valid: false,
    })
  })

  it('is a no-op for a safe href', () => {
    expect(dangerousHrefRule(ctx({ href: 'https://example.com' }))).toEqual([])
  })

  it('is a no-op for mailto:/tel: hrefs', () => {
    expect(dangerousHrefRule(ctx({ href: 'mailto:test@example.com' }))).toEqual([])
    expect(dangerousHrefRule(ctx({ href: 'tel:+15555555555' }))).toEqual([])
  })

  it('is a no-op when href is absent, or not a string', () => {
    expect(dangerousHrefRule(ctx({}))).toEqual([])
    expect(dangerousHrefRule(ctx({ href: 123 }))).toEqual([])
    expect(dangerousHrefRule(ctx({ href: null }))).toEqual([])
  })

  it('removes only href when the fix is applied, leaving other props untouched', () => {
    const context = ctx({ href: 'javascript:alert(1)', id: 'foo', className: 'bar' })
    const [result] = dangerousHrefRule(context)
    if (!result || result.valid || !result.fixable) throw new Error('expected a fixable violation')
    const fixResult = result.fix.apply(context)
    expect(fixResult).toMatchObject({ applied: true })
    expect(fixResult.next).toEqual({ id: 'foo', className: 'bar' })
  })

  it('declares readsProps and tags', () => {
    expectRuleMetadata(dangerousHrefRule, ['href'], ['a'])
  })
})

describe('roleButtonWithHrefRule', () => {
  it('flags role="button" combined with a real href', () => {
    const [result] = roleButtonWithHrefRule(ctx({ role: 'button', href: '/about' }))
    expect(result).toMatchObject({ valid: false, severity: 'warning', fixable: false })
    if (!result || result.valid) throw new Error('expected a violation')
    expect(result.diagnostic?.code).toBe(DiagnosticCode.A11yAnchorRoleButtonWithHref)
  })

  it('is a no-op for role="button" without an href', () => {
    expect(roleButtonWithHrefRule(ctx({ role: 'button' }))).toEqual([])
    expect(roleButtonWithHrefRule(ctx({ role: 'button', href: '' }))).toEqual([])
  })

  it('is a no-op for an href without role="button"', () => {
    expect(roleButtonWithHrefRule(ctx({ href: '/about' }))).toEqual([])
    expect(roleButtonWithHrefRule(ctx({ href: '/about', role: 'link' }))).toEqual([])
  })

  it('declares readsProps and tags', () => {
    expectRuleMetadata(roleButtonWithHrefRule, ['role', 'href'], ['a'])
  })
})

describe('ariaDisabledInertRule', () => {
  it('flags aria-disabled={true}', () => {
    const [result] = ariaDisabledInertRule(ctx({ href: '/about', 'aria-disabled': true }))
    expect(result).toMatchObject({ valid: false, severity: 'warning', fixable: false })
    if (!result || result.valid) throw new Error('expected a violation')
    expect(result.diagnostic?.code).toBe(DiagnosticCode.A11yAnchorAriaDisabledInert)
  })

  it('flags aria-disabled="true"', () => {
    const [result] = ariaDisabledInertRule(ctx({ href: '/about', 'aria-disabled': 'true' }))
    expect(result).toMatchObject({ valid: false, severity: 'warning', fixable: false })
  })

  it('is a no-op without aria-disabled', () => {
    expect(ariaDisabledInertRule(ctx({ href: '/about' }))).toEqual([])
  })

  it('is a no-op for aria-disabled="false"', () => {
    expect(ariaDisabledInertRule(ctx({ href: '/about', 'aria-disabled': 'false' }))).toEqual([])
  })

  it('is a no-op without an href — the anchor is already inert', () => {
    expect(ariaDisabledInertRule(ctx({ 'aria-disabled': true }))).toEqual([])
    expect(ariaDisabledInertRule(ctx({ href: '', 'aria-disabled': true }))).toEqual([])
  })

  it('declares readsProps and tags', () => {
    expectRuleMetadata(ariaDisabledInertRule, ['aria-disabled', 'href'], ['a'])
  })
})

describe('ANCHOR_RULES', () => {
  it('includes all three anchor rules', () => {
    expect(ANCHOR_RULES).toEqual([dangerousHrefRule, roleButtonWithHrefRule, ariaDisabledInertRule])
  })
})
