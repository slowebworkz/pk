import { describe, expect, it } from 'vitest'

import type { AriaContext } from '../types'
import { roleNotPermittedRule } from './role-restrictions'

function ctx(
  tag: string,
  props: Record<string, unknown>,
  implicitRole: string | undefined,
): AriaContext {
  return {
    tag: tag as AriaContext['tag'],
    props,
    implicitRole,
    effectiveRole: undefined,
    variantKeys: new Set(),
  }
}

describe('roleNotPermittedRule', () => {
  it('allows a documented alternate role', () => {
    expect(
      roleNotPermittedRule(ctx('input', { type: 'checkbox', role: 'switch' }, 'checkbox')),
    ).toEqual([])
    expect(roleNotPermittedRule(ctx('a', { role: 'button' }, 'link'))).toEqual([])
    expect(roleNotPermittedRule(ctx('ul', { role: 'tree' }, 'list'))).toEqual([])
  })

  it('flags a role outside the documented alternates', () => {
    const [result] = roleNotPermittedRule(
      ctx('input', { type: 'checkbox', role: 'banner' }, 'checkbox'),
    )
    expect(result).toMatchObject({ valid: false, severity: 'error', fixable: true })
  })

  it('flags any explicit role on a type with no permitted alternates (e.g. hidden)', () => {
    const [result] = roleNotPermittedRule(
      ctx('input', { type: 'hidden', role: 'textbox' }, undefined),
    )
    expect(result).toMatchObject({ valid: false, severity: 'error' })
  })

  it('is a no-op when role matches the implicit role (redundant-role check owns that case)', () => {
    expect(
      roleNotPermittedRule(ctx('input', { type: 'checkbox', role: 'checkbox' }, 'checkbox')),
    ).toEqual([])
  })

  it('is a no-op for a tag with no modeled allowed-roles table', () => {
    expect(roleNotPermittedRule(ctx('td', { role: 'gridcell' }, 'cell'))).toEqual([])
  })

  it('removes the role when the fix is applied', () => {
    const context = ctx('input', { type: 'checkbox', role: 'banner' }, 'checkbox')
    const [result] = roleNotPermittedRule(context)
    if (!result || result.valid || !result.fixable) throw new Error('expected a fixable violation')
    const fixResult = result.fix.apply(context)
    expect(fixResult).toMatchObject({ applied: true, next: { type: 'checkbox' } })
  })

  it('treats decorative images (alt="") as permitting no explicit role', () => {
    const [result] = roleNotPermittedRule(ctx('img', { alt: '', role: 'img' }, 'none'))
    expect(result).toMatchObject({ valid: false, severity: 'error' })
  })

  it('allows a documented alternate role on a named image', () => {
    expect(roleNotPermittedRule(ctx('img', { alt: 'A cat', role: 'button' }, 'img'))).toEqual([])
  })

  it('flags any explicit role on label — native labeling semantics have no ARIA equivalent', () => {
    const [result] = roleNotPermittedRule(ctx('label', { role: 'presentation' }, undefined))
    expect(result).toMatchObject({ valid: false, severity: 'error', fixable: true })
  })

  it('is a no-op for label with no role', () => {
    expect(roleNotPermittedRule(ctx('label', {}, undefined))).toEqual([])
  })
})
