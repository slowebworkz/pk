// These benchmarks isolate class resolution, tag dispatch, and prop merging
// independent of framework rendering. They do not measure allocations, GC
// pressure, React reconciliation, or JSX transform overhead — those require
// a render-level bench (pipeline.bench.ts, not yet implemented).
import { bench, describe } from 'vitest'
import { createPolymorphic } from '@praxis-kit/core'
import { cva } from 'class-variance-authority'
import type { AnyRecord } from '@praxis-kit/core'

// Runtimes are created once at module load so factory cost is excluded.
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
    },
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

// VariantClassResolver uses an LRU cache keyed on (recipe, sorted prop entries).
// Same-props calls hit the cache after the first render.
const WARM_PROPS: AnyRecord = { size: 'lg', intent: 'ghost' }

// i % arr.length is always a valid index for a non-empty array.
function pickCyclic<T>(arr: readonly T[], i: number): T {
  return arr[i % arr.length]!
}

// Cold pool: nonce is a declared variant with 1200 unique values.
//
// Why nonce instead of _bust:
//   _bust is not a declared variant, so the cache key is unique per call (good)
//   but cvaFn ignores _bust in #compute — resolver work is identical each call (bad).
//   nonce is declared, so CVA sees a genuinely different variant combination on each
//   call, exercising both the cache miss path and the resolver computation path.
const NONCE_VARIANTS: Record<string, string> = Object.fromEntries(
  Array.from({ length: 1200 }, (_, i) => [String(i), `n-${i}`]),
)

const coldCacheRuntime = createPolymorphic({
  tag: 'button',
  styling: {
    base: 'btn',
    variants: {
      size: { sm: 'btn--sm', md: 'btn--md', lg: 'btn--lg' },
      intent: { primary: 'btn--primary', ghost: 'btn--ghost' },
      nonce: NONCE_VARIANTS,
    },
    defaults: { size: 'md', intent: 'primary' },
    compounds: [{ size: 'lg', intent: 'ghost', class: 'btn--lg-ghost' }],
  },
})

const coldCvaFn = cva('btn', {
  variants: {
    size: { sm: 'btn--sm', md: 'btn--md', lg: 'btn--lg' },
    intent: { primary: 'btn--primary', ghost: 'btn--ghost' },
    nonce: NONCE_VARIANTS,
  },
  defaultVariants: { size: 'md', intent: 'primary' },
  compoundVariants: [{ size: 'lg', intent: 'ghost', class: 'btn--lg-ghost' }],
})

const COLD_SIZES = ['sm', 'md', 'lg'] as const
const COLD_INTENTS = ['primary', 'ghost'] as const

const COLD_POOL = Array.from({ length: 1200 }, (_, i) => ({
  size: pickCyclic(COLD_SIZES, i),
  intent: pickCyclic(COLD_INTENTS, i),
  nonce: String(i),
}))
let coldIdx = 0

// Large compound runtime: 200 compound rules across size × intent.
// Each render call checks all 200 rules linearly — this is where CVA's O(n)
// compound scan diverges from an indexed resolver.
//
// Cache key encoding note: the current key is a sorted, serialized string
// (Object.entries → toSorted → join). For declared variants only, integer
// bitmask encoding (size=lg→2, intent=ghost→1, key=(2<<1)|1) would make
// lookup near-constant and allocation-free. Worth profiling before implementing.
const LARGE_COMPOUND_VARIANTS = {
  size: { xs: 'btn--xs', sm: 'btn--sm', md: 'btn--md', lg: 'btn--lg', xl: 'btn--xl' },
  intent: {
    primary: 'btn--primary',
    secondary: 'btn--secondary',
    ghost: 'btn--ghost',
    danger: 'btn--danger',
  },
  tone: { solid: 'btn--solid', outline: 'btn--outline', soft: 'btn--soft' },
} as const

const SIZES_200 = ['xs', 'sm', 'md', 'lg', 'xl'] as const
const INTENTS_200 = ['primary', 'secondary', 'ghost', 'danger'] as const
const TONES_200 = ['solid', 'outline', 'soft'] as const

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const TWO_HUNDRED_COMPOUNDS: any[] = Array.from({ length: 200 }, (_, i) => ({
  size: SIZES_200[i % SIZES_200.length],
  intent: INTENTS_200[Math.floor(i / SIZES_200.length) % INTENTS_200.length],
  tone: TONES_200[Math.floor(i / (SIZES_200.length * INTENTS_200.length)) % TONES_200.length],
  class: `compound-${i}`,
}))

const largeCompoundRuntime = createPolymorphic({
  tag: 'button',
  styling: {
    base: 'btn',
    variants: LARGE_COMPOUND_VARIANTS,
    defaults: { size: 'md', intent: 'primary', tone: 'solid' },
    compounds: TWO_HUNDRED_COMPOUNDS,
  },
})

const largeCompoundCvaFn = cva('btn', {
  variants: LARGE_COMPOUND_VARIANTS,
  defaultVariants: { size: 'md', intent: 'primary', tone: 'solid' },
  compoundVariants: TWO_HUNDRED_COMPOUNDS,
})

// Miss: props don't hit any compound rule — forces full 200-rule scan.
const LARGE_NO_HIT: AnyRecord = { size: 'xl', intent: 'danger', tone: 'soft' }
// Hit: first compound fires early (best-case compound path).
const LARGE_HIT: AnyRecord = { size: 'xs', intent: 'primary', tone: 'solid' }

// ─── resolveTag isolation ──────────────────────────────────────────────────────
// resolveTag is `as || defaultTag` — expected to be near-zero in all cases.
// These groups confirm it's not a cost center and show the full differentiation
// story: praxis-kit adds ARIA validation and class composition on top of
// what CVA provides; resolveTag itself is the same trivial cost in both.

const FnComponent = () => null

describe('resolveTag — tag type dispatch', () => {
  bench('undefined (uses default tag)', () => {
    variantRuntime.resolveTag()
  })
  bench('intrinsic override (as="a")', () => {
    variantRuntime.resolveTag('a' as never)
  })
  bench('component override (as=FnComponent)', () => {
    variantRuntime.resolveTag(FnComponent as never)
  })
})

// ─── resolveProps isolation ────────────────────────────────────────────────────
// resolveProps runs mergeProps (prop spread with defaults) + ARIA validation.
// Tag matters here: 'div' has no implicit role → ARIA exits early.
// 'button' has implicit role → full ARIA attribute scan runs.

describe('resolveProps — by tag (ARIA cost varies by implicit role)', () => {
  bench('div tag (no implicit role → ARIA early exit)', () => {
    noVariantRuntime.resolveProps({ className: 'extra', id: 'x' })
  })
  bench('button tag (implicit role → full ARIA scan)', () => {
    variantRuntime.resolveProps({ className: 'extra', 'aria-label': 'close', id: 'x' })
  })
})

// ─── resolveClasses isolation ──────────────────────────────────────────────────

describe('resolveClasses — no variants (warm cache)', () => {
  bench('resolveClasses', () => {
    noVariantRuntime.resolveClasses('div', {})
  })
})

describe('resolveClasses — with variants, warm cache', () => {
  bench('resolveClasses', () => {
    variantRuntime.resolveClasses('button', WARM_PROPS)
  })

  bench('cva direct (baseline)', () => {
    cvaFn(WARM_PROPS)
  })
})

describe('resolveClasses — with variants, cold cache (nonce variant, genuine resolver churn)', () => {
  bench('resolveClasses', () => {
    coldCacheRuntime.resolveClasses('button', COLD_POOL[coldIdx++ % COLD_POOL.length]!)
  })

  bench('cva direct (baseline)', () => {
    coldCvaFn(COLD_POOL[coldIdx++ % COLD_POOL.length]!)
  })
})

// ─── Large compound scan ───────────────────────────────────────────────────────
// CVA checks compound rules linearly — 200 rules means 200 condition checks
// per render regardless of match. This is where an indexed resolver would
// diverge: only rules whose declared keys match the prop set need checking.

describe('resolveClasses — 200 compound rules, no hit (full scan)', () => {
  bench('resolveClasses', () => {
    largeCompoundRuntime.resolveClasses('button', LARGE_NO_HIT)
  })
  bench('cva direct (baseline)', () => {
    largeCompoundCvaFn(LARGE_NO_HIT)
  })
})

describe('resolveClasses — 200 compound rules, first rule hits (early exit)', () => {
  bench('resolveClasses', () => {
    largeCompoundRuntime.resolveClasses('button', LARGE_HIT)
  })
  bench('cva direct (baseline)', () => {
    largeCompoundCvaFn(LARGE_HIT)
  })
})

// ─── Full pipeline ─────────────────────────────────────────────────────────────

describe('full render pipeline (resolveTag + resolveProps + resolveClasses)', () => {
  bench('pipeline — no variants', () => {
    const tag = noVariantRuntime.resolveTag()
    const merged = noVariantRuntime.resolveProps({ className: 'extra' })
    noVariantRuntime.resolveClasses(tag, merged, 'extra')
  })

  bench('pipeline — with variants (warm)', () => {
    const tag = variantRuntime.resolveTag()
    const merged = variantRuntime.resolveProps(WARM_PROPS)
    variantRuntime.resolveClasses(tag, merged)
  })
})
