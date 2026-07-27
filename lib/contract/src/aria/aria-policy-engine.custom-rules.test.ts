import { describe, expect, it, vi } from 'vitest'

import { AriaPolicyEngine } from './polymorphic-validator'
import { silentDiagnostics } from '@praxis-kit/diagnostics'
import { isString } from '@praxis-kit/primitive'
import type { AnyRecord } from '@praxis-kit/primitive'

// A hand-rolled scheme check (startsWith, regex, or manual whitespace/case normalization) is
// inherently incomplete — it has to independently reproduce every quirk of URL scheme parsing
// (embedded whitespace stripping, case-insensitivity, etc.) to be safe, and is easy to get subtly
// wrong. Delegating to the URL parser itself closes every such gap at once: it's the same parser
// browsers use to decide the scheme, so there's nothing left to bypass.
function hasDangerousScheme(href: string): boolean {
  try {
    // `.protocol` is spec-guaranteed lowercase already, but the explicit toLowerCase() keeps
    // the case-insensitivity of this check visible in the code itself rather than resting on
    // an unstated assumption about URL's normalization behavior.
    return new URL(href).protocol.toLowerCase() === 'javascript:'
  } catch {
    // Not a parseable absolute URL (e.g. a relative path) — cannot be a javascript: URL.
    return false
  }
}

// ---------------------------------------------------------------------------
// AriaPolicyEngine — custom rules via constructor options
// ---------------------------------------------------------------------------

describe('AriaPolicyEngine — custom rules via constructor', () => {
  it('fires a custom rule violation', () => {
    const customRule = () => [
      {
        valid: false as const,
        severity: 'warning' as const,
        message: 'custom rule fired',
        fixable: false as const,
      },
    ]
    const v = new AriaPolicyEngine(silentDiagnostics, { rules: [customRule] })
    const { violations } = v.validate('nav', {})
    expect(violations.some((v) => v.message === 'custom rule fired')).toBe(true)
  })

  it('applies fix from a custom rule', () => {
    const customRule = () => [
      {
        valid: false as const,
        severity: 'warning' as const,
        message: 'remove data-custom',
        fixable: true as const,
        fix: {
          kind: 'removeAttribute' as const,
          attribute: 'data-custom',
          apply: ({ props }: { props: AnyRecord }) =>
            'data-custom' in props
              ? {
                  applied: true as const,
                  next: Object.fromEntries(
                    Object.entries(props).filter(([k]) => k !== 'data-custom'),
                  ),
                  previous: props,
                }
              : { applied: false as const, next: props },
        },
      },
    ]
    const v = new AriaPolicyEngine(silentDiagnostics, { rules: [customRule] })
    const { props } = v.validate('nav', { 'data-custom': '1' } as never)
    expect(props).not.toHaveProperty('data-custom')
  })

  it('runs multiple custom rules and collects all violations', () => {
    const ruleA = () => [
      {
        valid: false as const,
        severity: 'warning' as const,
        message: 'A',
        fixable: false as const,
      },
    ]
    const ruleB = () => [
      {
        valid: false as const,
        severity: 'warning' as const,
        message: 'B',
        fixable: false as const,
      },
    ]
    const v = new AriaPolicyEngine(silentDiagnostics, { rules: [ruleA, ruleB] })
    const { violations } = v.validate('nav', {})
    const msgs = violations.map((v) => v.message)
    expect(msgs).toContain('A')
    expect(msgs).toContain('B')
  })

  it('still runs extra rules for a tag with no implicit role', () => {
    // div has no implicit role and no explicit role — the built-in role-semantic pipeline is
    // meaningless here and stays gated, but a consumer's own extra rule may have nothing to do
    // with roles at all and must still run.
    const customRule = () => [
      {
        valid: false as const,
        severity: 'warning' as const,
        message: 'should fire',
        fixable: false as const,
      },
    ]
    const v = new AriaPolicyEngine(silentDiagnostics, { rules: [customRule] })
    const { violations } = v.validate('div', {})
    expect(violations.some((v) => v.message === 'should fire')).toBe(true)
  })

  it('runs a custom rule for input types with no implicit role (color, date, file, password, ...)', () => {
    // Direct repro from the original bug report: <input type="color" aria-label="Swatch" />
    // has no implicit role and no explicit role prop, so a design system's own type-validation
    // rule (with no relationship to ARIA roles at all) must still be given the chance to run.
    const supportedTypeRule = (ctx: { props: AnyRecord }) => {
      const type = ctx.props.type
      if (type !== 'color') return [{ valid: true as const }]
      return [
        {
          valid: false as const,
          severity: 'warning' as const,
          message: 'unsupported input type',
          fixable: false as const,
        },
      ]
    }
    const v = new AriaPolicyEngine(silentDiagnostics, { rules: [supportedTypeRule] })
    const { violations } = v.validate('input', {
      type: 'color',
      'aria-label': 'Swatch',
    } as never)
    expect(violations.some((v) => v.message === 'unsupported input type')).toBe(true)
  })

  it('does not run the built-in role-semantic pipeline for a roleless element, even with extra rules present', () => {
    // aria-checked is invalid for every role, but a roleless element has nothing for the
    // built-in pipeline to validate against — it must stay silent about it, exactly as before
    // this fix, while the unrelated extra rule still fires.
    const customRule = () => [{ valid: true as const }]
    const v = new AriaPolicyEngine(silentDiagnostics, { rules: [customRule] })
    const { violations } = v.validate('input', { type: 'color', 'aria-checked': 'true' } as never)
    expect(violations).toHaveLength(0)
  })

  it('custom rule returning valid results adds no violation', () => {
    const customRule = () => [{ valid: true as const }]
    const v = new AriaPolicyEngine(silentDiagnostics, { rules: [customRule] })
    const { violations } = v.validate('nav', {})
    expect(violations).toHaveLength(0)
  })

  it('does not replay a stale plan when a custom rule depends on a prop outside the cache key', () => {
    // Regression test: #createPlanKey only encodes tag/role/type/alt/aria-*, so a custom
    // rule inspecting e.g. `href` would previously have its first-render outcome cached
    // and blindly replayed for every subsequent element sharing the same (tag, role) —
    // even though `href` differed and was never itself part of the key.
    const stripDangerousHref = (ctx: { props: AnyRecord }) => {
      const href = ctx.props.href
      if (!isString(href) || !hasDangerousScheme(href)) return [{ valid: true as const }]
      return [
        {
          valid: false as const,
          severity: 'error' as const,
          message: 'dangerous href stripped',
          fixable: true as const,
          fix: {
            kind: 'removeAttribute' as const,
            attribute: 'href',
            apply: ({ props }: { props: AnyRecord }) => ({
              applied: true as const,
              next: Object.fromEntries(Object.entries(props).filter(([k]) => k !== 'href')),
              previous: props,
            }),
          },
        },
      ]
    }
    const v = new AriaPolicyEngine(silentDiagnostics, { rules: [stripDangerousHref] })

    // Same tag, no explicit role, no aria-* — identical cache key under the old scheme.
    const first = v.validate('nav', { href: 'javascript:alert(1)' } as never)
    expect(first.props).not.toHaveProperty('href')

    const second = v.validate('nav', { href: 'https://example.com' } as never)
    expect(second.props).toHaveProperty('href', 'https://example.com')
  })

  it('opts back into caching when a custom rule declares readsProps', () => {
    // A rule that declares which props it reads lets the engine fold those props into the
    // cache key instead of bypassing caching outright — same correctness as the uncached
    // case, but repeated (tag, role, href) combinations hit the cache.
    const calls = vi.fn()
    const stripDangerousHref = Object.assign(
      (ctx: { props: AnyRecord }) => {
        calls()
        const href = ctx.props.href
        if (!isString(href) || !hasDangerousScheme(href)) return [{ valid: true as const }]
        return [
          {
            valid: false as const,
            severity: 'error' as const,
            message: 'dangerous href stripped',
            fixable: true as const,
            fix: {
              kind: 'removeAttribute' as const,
              attribute: 'href',
              apply: ({ props }: { props: AnyRecord }) => ({
                applied: true as const,
                next: Object.fromEntries(Object.entries(props).filter(([k]) => k !== 'href')),
                previous: props,
              }),
            },
          },
        ]
      },
      { readsProps: ['href'] as const },
    )
    const v = new AriaPolicyEngine(silentDiagnostics, { rules: [stripDangerousHref] })

    const dangerous1 = v.validate('nav', { href: 'javascript:alert(1)' } as never)
    expect(dangerous1.props).not.toHaveProperty('href')
    const safe = v.validate('nav', { href: 'https://example.com' } as never)
    expect(safe.props).toHaveProperty('href', 'https://example.com')
    expect(calls).toHaveBeenCalledTimes(2)

    // Same (tag, role, href) as the first call — should hit the cache, not re-invoke the rule.
    const dangerous2 = v.validate('nav', { href: 'javascript:alert(1)' } as never)
    expect(dangerous2.props).not.toHaveProperty('href')
    expect(calls).toHaveBeenCalledTimes(2)
  })

  it('applies fixes from two custom rules respecting priority order', () => {
    const log: string[] = []
    const ruleHigh = () => [
      {
        valid: false as const,
        severity: 'warning' as const,
        message: 'high priority fix',
        fixable: true as const,
        fix: {
          kind: 'removeAttribute' as const,
          attribute: 'data-high',
          priority: 0,
          apply: ({ props }: { props: AnyRecord }) => {
            log.push('high')
            return 'data-high' in props
              ? {
                  applied: true as const,
                  next: Object.fromEntries(
                    Object.entries(props).filter(([k]) => k !== 'data-high'),
                  ),
                  previous: props,
                }
              : { applied: false as const, next: props }
          },
        },
      },
    ]
    const ruleLow = () => [
      {
        valid: false as const,
        severity: 'warning' as const,
        message: 'low priority fix',
        fixable: true as const,
        fix: {
          kind: 'removeAttribute' as const,
          attribute: 'data-low',
          priority: 10,
          apply: ({ props }: { props: AnyRecord }) => {
            log.push('low')
            return 'data-low' in props
              ? {
                  applied: true as const,
                  next: Object.fromEntries(Object.entries(props).filter(([k]) => k !== 'data-low')),
                  previous: props,
                }
              : { applied: false as const, next: props }
          },
        },
      },
    ]
    const v = new AriaPolicyEngine(silentDiagnostics, { rules: [ruleLow, ruleHigh] })
    const { props } = v.validate('nav', { 'data-high': '1', 'data-low': '2' } as never)
    expect(props).not.toHaveProperty('data-high')
    expect(props).not.toHaveProperty('data-low')
    // high-priority (0) runs before low-priority (10) regardless of rule declaration order
    expect(log).toEqual(['high', 'low'])
  })

  it('skips calling a custom rule entirely for a tag not in its declared tags', () => {
    // A rule that declares `tags` can only ever produce a result for those tags — the engine
    // should never invoke it for any other tag, rather than relying on the rule's own internal
    // early return.
    const calls = vi.fn()
    const inputOnlyRule = Object.assign(
      () => {
        calls()
        return [{ valid: true as const }]
      },
      { tags: ['input'] as const },
    )
    const v = new AriaPolicyEngine(silentDiagnostics, { rules: [inputOnlyRule] })

    v.validate('nav', {})
    expect(calls).not.toHaveBeenCalled()

    v.validate('input', { type: 'checkbox' } as never)
    expect(calls).toHaveBeenCalledTimes(1)
  })
})
