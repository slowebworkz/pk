import { describe, expect, it, vi } from 'vitest'
import {
  CollectingReporter,
  DefaultPolicy,
  Diagnostics,
  Severity,
  silentDiagnostics,
} from '@praxis-kit/diagnostics'
import { createPolymorphic } from './create-polymorphic'

function makeCollecting() {
  const reporter = new CollectingReporter()
  const diagnostics = new Diagnostics(
    reporter,
    new DefaultPolicy({ reportThreshold: Severity.Warning, throwThreshold: Severity.Fatal }),
  )
  return { reporter, diagnostics }
}

// Contract tests for the pipeline-based PolymorphicRuntime.
//
// These tests verify the public runtime behavior independently of the original implementation.
// They also cover runtime capabilities introduced by the pipeline architecture, including HTML
// prop normalizers and built-in HTML children evaluators.

// ---------------------------------------------------------------------------
// resolveTag / resolveProps
// ---------------------------------------------------------------------------

describe('createPolymorphic — resolveTag()', () => {
  it('returns defaultTag when no as provided', () => {
    const runtime = createPolymorphic({ tag: 'section' })
    expect(runtime.resolveTag()).toBe('section')
  })

  it('returns as when provided', () => {
    const runtime = createPolymorphic({ tag: 'div' })
    expect(runtime.resolveTag('article')).toBe('article')
  })
})

describe('createPolymorphic — resolveProps()', () => {
  it('returns instance props unchanged when no defaults configured', () => {
    const runtime = createPolymorphic({})
    expect(runtime.resolveProps({ className: 'foo' })).toEqual({ className: 'foo' })
  })

  it('fills in defaults that are missing from instance props', () => {
    const runtime = createPolymorphic({ defaults: { 'data-testid': 'card' } as never })
    expect(runtime.resolveProps({})).toMatchObject({ 'data-testid': 'card' })
  })
})

// ---------------------------------------------------------------------------
// resolveClasses
// ---------------------------------------------------------------------------

describe('createPolymorphic — resolveClasses()', () => {
  it('returns base class', () => {
    const runtime = createPolymorphic({ styling: { base: 'rounded-lg' } })
    expect(runtime.resolveClasses('div', {})).toContain('rounded-lg')
  })

  it('applies variant classes', () => {
    const runtime = createPolymorphic({
      styling: {
        base: 'base',
        variants: { size: { sm: 'text-sm', lg: 'text-lg' } },
        defaults: { size: 'sm' },
      },
    })
    expect(runtime.resolveClasses('div', { size: 'lg' })).toContain('text-lg')
  })
})

// ---------------------------------------------------------------------------
// resolveAria
// ---------------------------------------------------------------------------

describe('createPolymorphic — resolveAria()', () => {
  it('passes props through unchanged when no enforcement config', () => {
    const runtime = createPolymorphic({ tag: 'button' })
    const props = { 'aria-checked': 'true' }
    expect(runtime.resolveAria('button', props).props).toMatchObject({ 'aria-checked': 'true' })
  })

  it('strips an invalid aria-* attribute for the effective role when enforcement is declared', () => {
    const runtime = createPolymorphic({
      tag: 'button',
      enforcement: { diagnostics: silentDiagnostics },
    })
    // aria-checked is not valid on role="button"
    const result = runtime.resolveAria('button', { 'aria-checked': 'true' })
    expect(result.props).not.toHaveProperty('aria-checked')
  })

  // enforcement.rules exists for rules with no relationship to ARIA (e.g. a dangerous-URL-scheme
  // security guard) that still need AriaPolicyEngine's fix machinery, without having to sit under
  // the misleadingly-named `aria` bucket to get it.
  it('runs an enforcement.rules fix for a roleless tag (no relationship to ARIA)', () => {
    const stripDataUnsafe = Object.assign(
      (ctx: { props: Record<string, unknown> }) => {
        if (!('data-unsafe' in ctx.props)) return [{ valid: true as const }]
        return [
          {
            valid: false as const,
            severity: 'error' as const,
            fixable: true as const,
            fix: {
              kind: 'removeAttribute' as const,
              attribute: 'data-unsafe',
              apply: ({ props }: { props: Record<string, unknown> }) => {
                const { 'data-unsafe': _omit, ...rest } = props
                return { applied: true as const, next: rest, previous: props }
              },
            },
          },
        ]
      },
      { readsProps: ['data-unsafe'] as const },
    )
    // 'span' has no implicit role and no explicit role prop — the exact "roleless" case
    // enforcement.rules must still run for (see finding #14).
    const runtime = createPolymorphic({
      tag: 'span',
      enforcement: { diagnostics: silentDiagnostics, rules: [stripDataUnsafe] },
    })
    const result = runtime.resolveAria('span', { 'data-unsafe': 'x' })
    expect(result.props).not.toHaveProperty('data-unsafe')
  })

  it('merges enforcement.aria and enforcement.rules — both run', () => {
    const failAria = () => [
      {
        valid: false as const,
        severity: 'warning' as const,
        fixable: false as const,
        message: 'A',
      },
    ]
    const failRule = () => [
      {
        valid: false as const,
        severity: 'warning' as const,
        fixable: false as const,
        message: 'B',
      },
    ]
    const { reporter, diagnostics } = makeCollecting()
    const runtime = createPolymorphic({
      tag: 'button',
      enforcement: { diagnostics, aria: [failAria], rules: [failRule] },
    })
    runtime.resolveAria('button', {})
    const messages = reporter.diagnostics.map((d) => d.message)
    expect(messages).toContain('A')
    expect(messages).toContain('B')
  })
})

// ---------------------------------------------------------------------------
// options
// ---------------------------------------------------------------------------

describe('createPolymorphic — options', () => {
  it('exposes frozen runtime options', () => {
    const runtime = createPolymorphic({ tag: 'section' })
    expect(runtime.options.defaultTag).toBe('section')
    expect(Object.isFrozen(runtime.options)).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// plugin contract — resolveClassPlugin wiring
// ---------------------------------------------------------------------------

describe('createPolymorphic — plugin contract', () => {
  it('accepts a well-formed plugin factory and sets hasStyling/classPlugin', () => {
    const runtime = createPolymorphic({
      styling: {
        plugin: () => ({
          pipeline: (_tag, _props, cls) => (Array.isArray(cls) ? cls.join(' ') : (cls ?? '')),
        }),
      },
    })
    expect(runtime).toMatchObject({ hasStyling: true })
    expect('classPlugin' in runtime).toBe(true)
  })

  it('throws at factory time when the plugin factory returns null', () => {
    expect(() => createPolymorphic({ styling: { plugin: () => null as never } })).toThrow(
      "Plugin factory must return an object with a 'pipeline' function. Got: null.",
    )
  })

  it("uses the plugin's pipeline to resolve classes", () => {
    const runtime = createPolymorphic({
      styling: { plugin: () => ({ pipeline: () => 'plugin-output' }) },
    })
    expect(runtime.resolveClasses('div', {})).toBe('plugin-output')
  })
})

// ---------------------------------------------------------------------------
// Built-in HTML prop normalizers
// ---------------------------------------------------------------------------

describe('createPolymorphic — options.htmlPropNormalizersFn', () => {
  it('is present regardless of enforcement config', () => {
    const runtime = createPolymorphic({})
    expect(typeof runtime.options.htmlPropNormalizersFn).toBe('function')
  })

  it('returns built-in normalizers for a form tag', () => {
    const runtime = createPolymorphic({})
    const normalizers = runtime.options.htmlPropNormalizersFn?.('button')
    expect(normalizers?.length).toBeGreaterThan(0)
  })

  it('returns undefined for a tag with no built-in normalizers', () => {
    const runtime = createPolymorphic({})
    expect(runtime.options.htmlPropNormalizersFn?.('div')).toBeUndefined()
  })

  it('applying the disabled-button normalizer adds aria-disabled', () => {
    const runtime = createPolymorphic({})
    const normalizers = runtime.options.htmlPropNormalizersFn?.('button') ?? []
    const patched = normalizers.reduce((acc, fn) => ({ ...acc, ...fn(acc) }), { disabled: true })
    expect(patched).toMatchObject({ 'aria-disabled': 'true' })
  })
})

// ---------------------------------------------------------------------------
// Built-in HTML children evaluators
// ---------------------------------------------------------------------------

describe('createPolymorphic — options.htmlChildrenEvaluatorFn', () => {
  it('is present regardless of enforcement config', () => {
    const runtime = createPolymorphic({})
    expect(typeof runtime.options.htmlChildrenEvaluatorFn).toBe('function')
  })

  it('returns a children evaluator for a tag with a built-in content-model contract', () => {
    const runtime = createPolymorphic({})
    const evaluator = runtime.options.htmlChildrenEvaluatorFn?.('picture')
    expect(evaluator).toBeDefined()
  })

  it('returns undefined for a tag with no built-in content-model contract', () => {
    const runtime = createPolymorphic({})
    expect(runtime.options.htmlChildrenEvaluatorFn?.('div')).toBeUndefined()
  })

  it('flags an invalid child against the built-in contract when evaluated', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const runtime = createPolymorphic({})
    // <picture> requires source*, then exactly one <img> — a bare <div> violates that.
    runtime.options.htmlChildrenEvaluatorFn?.('picture')?.evaluate([{ type: 'div' }])
    expect(warn).toHaveBeenCalled()
    warn.mockRestore()
  })
})
