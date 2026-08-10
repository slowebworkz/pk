import { bench, describe } from 'vitest'
import { createPolymorphic } from '@praxis-kit/core'
import { cva } from 'class-variance-authority'
import type { AnyRecord } from '@praxis-kit/core'

// ─── Shared configs ────────────────────────────────────────────────────────────
// Module-level runtimes exclude factory cost from resolver benchmarks.

const noVariantRuntime = createPolymorphic({
  tag: 'div',
  styling: { base: 'box' },
})

const variantRuntime = createPolymorphic({
  tag: 'button',
  styling: {
    base: 'btn',
    variants: {
      size: { sm: 'btn--sm', md: 'btn--md', lg: 'btn--lg' },
      intent: { primary: 'btn--primary', ghost: 'btn--ghost' },
    } as const,
    defaults: { size: 'md', intent: 'primary' },
  },
})

const compoundRuntime = createPolymorphic({
  tag: 'button',
  styling: {
    base: 'btn',
    variants: {
      size: { sm: 'btn--sm', md: 'btn--md', lg: 'btn--lg' },
      intent: { primary: 'btn--primary', ghost: 'btn--ghost' },
    } as const,
    defaults: { size: 'md', intent: 'primary' },
    compounds: [{ size: 'lg', intent: 'ghost', class: 'btn--lg-ghost' }],
  },
})

const cvaFn = cva('btn', {
  variants: {
    size: { sm: 'btn--sm', md: 'btn--md', lg: 'btn--lg' },
    intent: { primary: 'btn--primary', ghost: 'btn--ghost' },
  },
  defaultVariants: { size: 'md', intent: 'primary' },
  compoundVariants: [{ size: 'lg', intent: 'ghost', class: 'btn--lg-ghost' }],
})

const WARM_PROPS: AnyRecord = { size: 'lg', intent: 'ghost' }

// Rotated configs break V8 object-shape optimization on the factory input —
// key order and presence change each call, exposing normalization deopt risk.
let rotateIdx = 0
const ROTATED_CONFIGS = [
  { tag: 'button' as const, styling: { base: 'btn-a' } },
  { tag: 'div' as const, styling: { base: 'box-b' } },
  { tag: 'span' as const, styling: { base: 'text-c' } },
  { tag: 'a' as const, styling: { base: 'link-d' } },
]

// ─── Large variant matrix fixture ─────────────────────────────────────────────
// 6 variant dimensions × 3–6 values each, 30 compound rules.
// Approximates a mature design-system button where size × intent × state ×
// density × tone × emphasis all interact. This is where compound indexing,
// normalization strategy, and memoization start mattering.

const LARGE_VARIANTS = {
  size: { xs: 'btn--xs', sm: 'btn--sm', md: 'btn--md', lg: 'btn--lg', xl: 'btn--xl' },
  intent: {
    primary: 'btn--primary',
    secondary: 'btn--secondary',
    ghost: 'btn--ghost',
    danger: 'btn--danger',
    success: 'btn--success',
    warning: 'btn--warning',
  },
  state: { default: '', loading: 'btn--loading', disabled: 'btn--disabled' },
  density: { compact: 'btn--compact', normal: '', spacious: 'btn--spacious' },
  tone: { solid: 'btn--solid', outline: 'btn--outline', soft: 'btn--soft' },
  emphasis: { high: 'btn--emphasis-high', medium: 'btn--emphasis-mid', low: 'btn--emphasis-low' },
} as const

const LARGE_COMPOUNDS = [
  { size: 'lg', intent: 'primary', class: 'btn--lg-primary' },
  { size: 'lg', intent: 'ghost', class: 'btn--lg-ghost' },
  { size: 'xl', intent: 'danger', class: 'btn--xl-danger' },
  { size: 'sm', state: 'loading', class: 'btn--sm-loading' },
  { size: 'xs', density: 'compact', class: 'btn--xs-compact' },
  { intent: 'primary', tone: 'outline', class: 'btn--primary-outline' },
  { intent: 'ghost', tone: 'soft', class: 'btn--ghost-soft' },
  { intent: 'danger', emphasis: 'high', class: 'btn--danger-high' },
  { intent: 'success', tone: 'solid', class: 'btn--success-solid' },
  { intent: 'warning', emphasis: 'low', class: 'btn--warning-low' },
  { state: 'loading', tone: 'solid', class: 'btn--loading-solid' },
  { state: 'disabled', emphasis: 'low', class: 'btn--disabled-low' },
  { density: 'compact', size: 'sm', class: 'btn--compact-sm' },
  { density: 'spacious', size: 'xl', class: 'btn--spacious-xl' },
  { tone: 'outline', emphasis: 'high', class: 'btn--outline-high' },
  { tone: 'soft', emphasis: 'medium', class: 'btn--soft-mid' },
  { size: 'md', intent: 'secondary', tone: 'outline', class: 'btn--md-secondary-outline' },
  { size: 'lg', intent: 'ghost', tone: 'soft', class: 'btn--lg-ghost-soft' },
  { size: 'xl', intent: 'primary', emphasis: 'high', class: 'btn--xl-primary-high' },
  { intent: 'danger', state: 'loading', class: 'btn--danger-loading' },
  { intent: 'success', state: 'disabled', class: 'btn--success-disabled' },
  { intent: 'warning', state: 'loading', emphasis: 'high', class: 'btn--warning-loading-high' },
  { density: 'compact', tone: 'solid', emphasis: 'low', class: 'btn--compact-solid-low' },
  { density: 'spacious', tone: 'outline', emphasis: 'high', class: 'btn--spacious-outline-high' },
  { size: 'xs', intent: 'ghost', state: 'disabled', class: 'btn--xs-ghost-disabled' },
  { size: 'sm', tone: 'soft', emphasis: 'medium', class: 'btn--sm-soft-mid' },
  { size: 'lg', density: 'compact', tone: 'solid', class: 'btn--lg-compact-solid' },
  { size: 'xl', density: 'spacious', emphasis: 'high', class: 'btn--xl-spacious-high' },
  { intent: 'primary', density: 'compact', emphasis: 'high', class: 'btn--primary-compact-high' },
  {
    intent: 'secondary',
    density: 'spacious',
    tone: 'outline',
    class: 'btn--secondary-spacious-outline',
  },
] as const

const largeVariantRuntime = createPolymorphic({
  tag: 'button',
  styling: {
    base: 'btn',
    variants: LARGE_VARIANTS,
    defaults: {
      size: 'md',
      intent: 'primary',
      state: 'default',
      density: 'normal',
      tone: 'solid',
      emphasis: 'medium',
    },
    compounds: LARGE_COMPOUNDS,
  },
})

const LARGE_WARM_PROPS: AnyRecord = {
  size: 'lg',
  intent: 'ghost',
  tone: 'soft',
  state: 'default',
  density: 'normal',
  emphasis: 'medium',
}
const LARGE_COMPOUND_HIT: AnyRecord = {
  size: 'lg',
  intent: 'ghost',
  tone: 'soft',
  state: 'default',
  density: 'normal',
  emphasis: 'medium',
}

// ─── Cold path: factory construction ──────────────────────────────────────────

describe('factory — no variants (cold path)', () => {
  bench('createPolymorphic', () => {
    createPolymorphic({ tag: 'div', styling: { base: 'box' } })
  })
})

describe('factory — with variants (cold path)', () => {
  bench('createPolymorphic', () => {
    createPolymorphic({
      tag: 'button',
      styling: {
        base: 'btn',
        variants: {
          size: { sm: 'btn--sm', md: 'btn--md', lg: 'btn--lg' },
          intent: { primary: 'btn--primary', ghost: 'btn--ghost' },
        } as const,
        defaults: { size: 'md', intent: 'primary' },
      },
    })
  })

  bench('cva (baseline)', () => {
    cva('btn', {
      variants: {
        size: { sm: 'btn--sm', md: 'btn--md', lg: 'btn--lg' },
        intent: { primary: 'btn--primary', ghost: 'btn--ghost' },
      },
      defaultVariants: { size: 'md', intent: 'primary' },
    })
  })
})

describe('factory — with variants + compounds (cold path)', () => {
  bench('createPolymorphic', () => {
    createPolymorphic({
      tag: 'button',
      styling: {
        base: 'btn',
        variants: {
          size: { sm: 'btn--sm', md: 'btn--md', lg: 'btn--lg' },
          intent: { primary: 'btn--primary', ghost: 'btn--ghost' },
        } as const,
        defaults: { size: 'md', intent: 'primary' },
        compounds: [{ size: 'lg', intent: 'ghost', class: 'btn--lg-ghost' }],
      },
    })
  })

  bench('cva (baseline)', () => {
    cva('btn', {
      variants: {
        size: { sm: 'btn--sm', md: 'btn--md', lg: 'btn--lg' },
        intent: { primary: 'btn--primary', ghost: 'btn--ghost' },
      },
      defaultVariants: { size: 'md', intent: 'primary' },
      compoundVariants: [{ size: 'lg', intent: 'ghost', class: 'btn--lg-ghost' }],
    })
  })
})

// Repeated identical config: V8 sees a stable object shape and key order each
// call. The normalization pipeline may become monomorphic and near-zero after
// warmup. Contrast with rotated configs to expose any deopt from shape mutation.
describe('factory — repeated identical config (V8 shape stability)', () => {
  bench('createPolymorphic — same config every call', () => {
    createPolymorphic({ tag: 'button', styling: { base: 'btn' } })
  })

  bench('createPolymorphic — rotating configs (4 shapes, different keys each call)', () => {
    createPolymorphic(ROTATED_CONFIGS[rotateIdx++ % ROTATED_CONFIGS.length]!)
  })
})

// ─── Hot path: per-render resolver execution ───────────────────────────────────
// These use module-level runtimes so factory cost is excluded entirely.
// The numbers here are what the component pays on every render, not once.

describe('runtime execution — no variants (hot path, per-render)', () => {
  bench('resolveTag + resolveProps + resolveClasses', () => {
    const tag = noVariantRuntime.resolveTag()
    const merged = noVariantRuntime.resolveProps({ className: 'extra' })
    noVariantRuntime.resolveClasses(tag, merged, 'extra')
  })
})

describe('runtime execution — with variants, warm cache (hot path, per-render)', () => {
  bench('resolveTag + resolveProps + resolveClasses', () => {
    const tag = variantRuntime.resolveTag()
    const merged = variantRuntime.resolveProps(WARM_PROPS)
    variantRuntime.resolveClasses(tag, merged)
  })

  bench('cva direct (baseline)', () => {
    cvaFn(WARM_PROPS)
  })
})

describe('runtime execution — with variants + compounds, warm cache (hot path, per-render)', () => {
  bench('resolveTag + resolveProps + resolveClasses', () => {
    const tag = compoundRuntime.resolveTag()
    const merged = compoundRuntime.resolveProps(WARM_PROPS)
    compoundRuntime.resolveClasses(tag, merged)
  })

  bench('cva direct (baseline)', () => {
    cvaFn(WARM_PROPS)
  })
})

// ─── Large variant matrix ──────────────────────────────────────────────────────
// 6 dimensions × 3–6 values, 30 compound rules — design-system scale.
// Cold path shows normalization cost; hot path shows compound matching cost
// as the number of rules that must be checked per render grows.

describe('factory — large variant matrix, 6 dims × 30 compounds (cold path)', () => {
  bench('createPolymorphic', () => {
    createPolymorphic({
      tag: 'button',
      styling: {
        base: 'btn',
        variants: LARGE_VARIANTS,
        defaults: {
          size: 'md',
          intent: 'primary',
          state: 'default',
          density: 'normal',
          tone: 'solid',
          emphasis: 'medium',
        },
        compounds: LARGE_COMPOUNDS,
      },
    })
  })
})

describe('runtime execution — large variant matrix, warm cache (hot path, per-render)', () => {
  bench('resolveTag + resolveProps + resolveClasses (compound hit)', () => {
    const tag = largeVariantRuntime.resolveTag()
    const merged = largeVariantRuntime.resolveProps(LARGE_COMPOUND_HIT)
    largeVariantRuntime.resolveClasses(tag, merged)
  })

  bench('resolveTag + resolveProps + resolveClasses (no compound hit)', () => {
    const tag = largeVariantRuntime.resolveTag()
    const merged = largeVariantRuntime.resolveProps(LARGE_WARM_PROPS)
    largeVariantRuntime.resolveClasses(tag, merged)
  })
})
