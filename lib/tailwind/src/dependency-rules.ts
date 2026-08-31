import type { LAYOUT_FAMILY_MAP } from './constants'
import type { LayoutFamily } from './types/layout'

export type DependencyRules = Record<
  Exclude<LayoutFamily<typeof LAYOUT_FAMILY_MAP>, 'none'>,
  readonly RegExp[]
>

// Stripping is RESEMBLANCE-based, by design. A class is stripped under a
// conflicting layout mode because its name matches one of these prefixes, NOT
// because it's verified to be a real Tailwind utility that resolves to a
// grid/flex style. So `grid-triplets-1` (not a valid Tailwind class) is stripped
// in flex mode purely because it resembles a grid utility. This is the accepted
// break point: the plugin does not resolve against the Tailwind config. Don't
// name custom classes after these prefixes if they must survive a mode switch.
// Only *container* properties belong here — they're meaningful iff the element
// itself resolves to the family, so own-family gating is correct for them. Item
// and item-placement properties (grow/shrink/basis, col-*/row-*, justify-self-*,
// self-*, order-*, place-self-*) resolve against the PARENT's family instead and
// are classified as `kind: 'item'` in class-classifier.ts so they're never
// stripped here — see PRAXIS-KIT-FINDINGS.md #40.
export const defaultDependencyRules: DependencyRules = {
  flex: [/^flex-/],
  grid: [
    /^grid-/,
    /^auto-cols-/,
    /^auto-rows-/,
    // justify-items is a grid-container property (no-op on flex containers per
    // the CSS box alignment spec), so treat it as grid-only.
    /^justify-items-/,
  ],
} as const
