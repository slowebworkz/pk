import { describe, expect, it } from 'vitest'

import { resolveFactoryOptions } from './resolve-factory-options'
import { throwDiagnostics, warnDiagnostics, silentDiagnostics } from '@praxis-kit/diagnostics'

// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------

describe('resolveFactoryOptions() — defaults', () => {
  it('defaults defaultTag to "div"', () => {
    expect(resolveFactoryOptions({}).defaultTag).toBe('div')
  })

  it('defaults diagnostics to silentDiagnostics', () => {
    expect(resolveFactoryOptions({}).diagnostics).toBe(silentDiagnostics)
  })

  it('omits baseClassName when not provided', () => {
    expect(resolveFactoryOptions({})).not.toHaveProperty('baseClassName')
  })

  it('omits defaultProps when not provided', () => {
    expect(resolveFactoryOptions({})).not.toHaveProperty('defaultProps')
  })

  it('omits tagMap when not provided', () => {
    expect(resolveFactoryOptions({})).not.toHaveProperty('tagMap')
  })

  it('omits variants when not provided', () => {
    expect(resolveFactoryOptions({})).not.toHaveProperty('variants')
  })

  it('omits recipeMap when not provided', () => {
    expect(resolveFactoryOptions({})).not.toHaveProperty('recipeMap')
  })

  it('works with no argument (empty default)', () => {
    expect(() => resolveFactoryOptions()).not.toThrow()
  })
})

// ---------------------------------------------------------------------------
// Provided options are preserved
// ---------------------------------------------------------------------------

describe('resolveFactoryOptions() — provided options', () => {
  it('uses provided tag', () => {
    expect(resolveFactoryOptions({ tag: 'section' }).defaultTag).toBe('section')
  })

  it('uses provided diagnostics', () => {
    expect(
      resolveFactoryOptions({ enforcement: { diagnostics: warnDiagnostics } }).diagnostics,
    ).toBe(warnDiagnostics)
    expect(
      resolveFactoryOptions({ enforcement: { diagnostics: throwDiagnostics } }).diagnostics,
    ).toBe(throwDiagnostics)
    expect(
      resolveFactoryOptions({ enforcement: { diagnostics: silentDiagnostics } }).diagnostics,
    ).toBe(silentDiagnostics)
  })

  it.each([
    ['warn', warnDiagnostics],
    ['throw', throwDiagnostics],
    ['silent', silentDiagnostics],
  ] as const)('resolves the "%s" preset name to its Diagnostics instance', (mode, preset) => {
    expect(resolveFactoryOptions({ enforcement: { diagnostics: mode } }).diagnostics).toBe(preset)
  })

  // Adapters resolve their own diagnostics default (throwDiagnostics for most, silentDiagnostics
  // for Lit/Web) via resolveAdapterCommonOptions and spread it onto the options object as a
  // top-level `diagnostics` field before calling createPolymorphic. Without this, that
  // adapter-resolved default was silently discarded in favor of a hardcoded silentDiagnostics
  // fallback here, leaving allowedAs/aria enforcement silent by default everywhere.
  it('uses the adapter-resolved top-level diagnostics when enforcement.diagnostics is unset', () => {
    expect(resolveFactoryOptions({ diagnostics: throwDiagnostics }).diagnostics).toBe(
      throwDiagnostics,
    )
  })

  it('prefers enforcement.diagnostics over the adapter-resolved top-level diagnostics', () => {
    expect(
      resolveFactoryOptions({
        diagnostics: throwDiagnostics,
        enforcement: { diagnostics: warnDiagnostics },
      }).diagnostics,
    ).toBe(warnDiagnostics)
  })

  it('includes baseClassName when provided', () => {
    expect(resolveFactoryOptions({ styling: { base: 'rounded' } }).baseClassName).toBe('rounded')
  })

  it('includes tagMap when provided', () => {
    const tags = { section: 'sec' }
    expect(resolveFactoryOptions({ styling: { tags } }).tagMap).toEqual(tags)
  })

  it('includes defaultProps when provided', () => {
    const defaults = { 'data-testid': 'card' } as const
    expect(resolveFactoryOptions({ defaults }).defaultProps).toEqual(defaults)
  })

  it('includes variants when provided', () => {
    const variants = { size: { sm: 'text-sm' } }
    expect(resolveFactoryOptions({ styling: { variants } }).variants).toEqual(variants)
  })

  it('includes defaultVariants when provided', () => {
    const defaults = { size: 'sm' }
    expect(resolveFactoryOptions({ styling: { defaults } }).defaultVariants).toEqual(defaults)
  })

  it('includes recipeMap when provided', () => {
    const presets = { primary: { size: 'lg' } }
    expect(resolveFactoryOptions({ styling: { presets } }).recipeMap).toEqual(presets)
  })
})

// ---------------------------------------------------------------------------
// normalize
// ---------------------------------------------------------------------------

describe('resolveFactoryOptions() — normalize', () => {
  it('omits normalizeFn when normalize is not provided', () => {
    expect(resolveFactoryOptions({})).not.toHaveProperty('normalizeFn')
  })

  it('maps normalize to normalizeFn', () => {
    const normalize = (p: Record<string, unknown>) => p
    expect(resolveFactoryOptions({ normalize }).normalizeFn).toBe(normalize)
  })
})

// ---------------------------------------------------------------------------
// enforcement.aria / enforcement.rules
// ---------------------------------------------------------------------------

describe('resolveFactoryOptions() — enforcement.aria / enforcement.rules', () => {
  const ruleA = () => []
  const ruleB = () => []

  it('omits ariaRules when neither aria nor rules is provided', () => {
    expect(resolveFactoryOptions({})).not.toHaveProperty('ariaRules')
  })

  it('maps enforcement.aria to ariaRules', () => {
    expect(resolveFactoryOptions({ enforcement: { aria: [ruleA] } }).ariaRules).toEqual([ruleA])
  })

  it('maps enforcement.rules to ariaRules when aria is absent', () => {
    expect(resolveFactoryOptions({ enforcement: { rules: [ruleB] } }).ariaRules).toEqual([ruleB])
  })

  it('merges enforcement.aria and enforcement.rules into one ariaRules list', () => {
    // Both buckets are evaluated through the same AriaPolicyEngine — rules exists only so a
    // rule with no relationship to ARIA doesn't have to sit under the `aria` name.
    expect(
      resolveFactoryOptions({ enforcement: { aria: [ruleA], rules: [ruleB] } }).ariaRules,
    ).toEqual([ruleA, ruleB])
  })
})

// ---------------------------------------------------------------------------
// Result is frozen
// ---------------------------------------------------------------------------

describe('resolveFactoryOptions() — immutability', () => {
  it('returns a frozen object', () => {
    expect(Object.isFrozen(resolveFactoryOptions({}))).toBe(true)
  })

  it('frozen object prevents mutation', () => {
    const opts = resolveFactoryOptions({ tag: 'div' })
    expect(() => {
      ;(opts as Record<string, unknown>).defaultTag = 'section'
    }).toThrow()
  })
})
