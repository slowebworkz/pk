import type { LAYOUT_FAMILY_MAP } from './constants'
import { LAYOUT_OWNED_KEYS } from './constants'
import type { layoutKeys } from './layout-keys'
import type { ClassifiedToken, ClassToken, LayoutFamily, LayoutKey } from './types'
import { iterate } from '@praxis-kit/primitive'
import type { StringMap } from '@praxis-kit/primitive'

const CONDITIONALS = {
  '[&.flex': 'flex',
  '[&.grid': 'grid',
} as const satisfies Readonly<StringMap<Exclude<LayoutFamily<typeof LAYOUT_FAMILY_MAP>, 'none'>>>

// Flex/grid *item* (and item-placement) properties. Unlike container properties,
// these resolve against the element's PARENT display mode — an element is very
// often not a flex/grid container itself while still legitimately being a
// flex/grid *item* of its parent. This plugin can't observe the parent, so it
// must never strip these based on the element's own family: they're meaningful
// whenever the parent is a flex/grid container, and an inert no-op (not a
// conflict) otherwise. See PRAXIS-KIT-FINDINGS.md #40.
//
// - align-self / place-self / justify-self  → self-*, place-self-*, justify-self-*
// - order                                   → order-*
// - flex-grow / flex-shrink / flex-basis    → grow, shrink, basis-*
// - grid-row / grid-column                  → row-*, col-*
const ITEM_PREFIXES: readonly RegExp[] = [
  /^order/,
  /^grow/,
  /^shrink/,
  /^basis-/,
  /^self-/,
  /^place-self-/,
  /^justify-self-/,
  /^col-/,
  /^row-/,
]

// Utilities that only have an effect inside a flex OR grid *container*, but
// aren't specific to either family: justify-content, align-items, align-content,
// and the place-content/place-items shorthands all apply to both flex and grid
// per the Tailwind docs. Like gap, these should survive when either family is
// active on the element itself and be stripped when neither is.
//
// justify-items- is excluded — it's a grid-container property (no-op on flex),
// handled by dependency-rules.ts. justify-self- is an item property, handled by
// ITEM_PREFIXES above.
//
// content- is enumerated rather than an open `/^content-/` prefix: the CSS
// content property (`content-['<']`, `content-none`, etc., used via
// before:/after:) is base-shaped identically to the flex/grid content-*
// alignment family after variant-prefix stripping, but is valid on any
// element regardless of display mode and must never be treated as shared.
const SHARED_PREFIXES: readonly RegExp[] = [
  /^justify-(?!items-|self-)/,
  /^content-(normal|center|start|end|between|around|evenly|stretch)$/,
  /^items-/,
  /^place-content-/,
  /^place-items-/,
]

export class ClassClassifier {
  static #getBaseUtility(token: string): string {
    let depth = 0

    return (
      iterate.findLast(token, (char, index) => {
        if (char === ']') depth++
        else if (char === '[') depth--
        else if (char === ':' && depth === 0 && token[index - 1] !== '\\') {
          return token.slice(index + 1)
        }

        return null
      }) ?? token
    )
  }

  classify(token: ClassToken): ClassifiedToken {
    const base = ClassClassifier.#getBaseUtility(token)

    if (LAYOUT_OWNED_KEYS.has(base)) {
      return {
        kind: 'layout',
        value: base as LayoutKey<typeof layoutKeys>,
        raw: token,
      }
    }

    const conditional: ClassifiedToken | null = iterate.find(
      Object.entries(CONDITIONALS),
      ([prefix, requires]) => {
        return token.startsWith(prefix)
          ? {
              kind: 'conditional',
              requires,
              raw: token,
            }
          : null
      },
    )
    if (conditional !== null) return conditional

    if (base === 'gap' || base.startsWith('gap-')) {
      return { kind: 'gap', raw: token }
    }

    if (ITEM_PREFIXES.some((rule) => rule.test(base))) {
      return { kind: 'item', raw: token }
    }

    if (SHARED_PREFIXES.some((rule) => rule.test(base))) {
      return { kind: 'shared', raw: token }
    }

    return { kind: 'utility', base, raw: token }
  }
}
