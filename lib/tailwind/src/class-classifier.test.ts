import { describe, expect, it } from 'vitest'

import { ClassClassifier } from './class-classifier'
import type { layoutKeys } from './layout-keys'
import type { LayoutKey } from './types'

import { iterate } from '@praxis-kit/primitive'

const c = new ClassClassifier()

function expectLayout(token: string, value: LayoutKey<typeof layoutKeys>) {
  expect(c.classify(token)).toEqual({ kind: 'layout', value, raw: token })
}

function expectGap(token: string) {
  expect(c.classify(token)).toEqual({ kind: 'gap', raw: token })
}

function expectShared(token: string) {
  expect(c.classify(token)).toEqual({ kind: 'shared', raw: token })
}

function expectItem(token: string) {
  expect(c.classify(token)).toEqual({ kind: 'item', raw: token })
}

function expectConditional(token: string, requires: 'flex' | 'grid') {
  expect(c.classify(token)).toEqual({ kind: 'conditional', requires, raw: token })
}

function expectUtility(token: string, base: string = token) {
  expect(c.classify(token)).toEqual({ kind: 'utility', base, raw: token })
}

describe('ClassClassifier — layout tokens', () => {
  it.each<[string, LayoutKey<typeof layoutKeys>]>([
    ['flex', 'flex'],
    ['inline-flex', 'inline-flex'],
    ['grid', 'grid'],
    ['inline-grid', 'inline-grid'],
    ['block', 'block'],
    ['inline-block', 'inline-block'],
    ['inline', 'inline'],
    ['hidden', 'hidden'],
    ['contents', 'contents'],
    ['flow-root', 'flow-root'],
    ['hover:flex', 'flex'],
    ['sm:grid', 'grid'],
    ['sm:hover:inline-flex', 'inline-flex'],
  ])('classifies "%s" as layout %s', (token, value) => {
    expectLayout(token, value)
  })
})

describe('ClassClassifier — gap tokens', () => {
  it.each(['gap', 'gap-4', 'gap-x-2', 'hover:gap-4'])('classifies "%s" as gap', (token) => {
    expectGap(token)
  })

  it('does not classify "gapfoo" as gap (no hyphen separator)', () => {
    expectUtility('gapfoo')
  })
})

describe('ClassClassifier — shared (flex-or-grid container) tokens', () => {
  it.each([
    'justify-center',
    'justify-between',
    'content-start',
    'items-start',
    'items-center',
    'place-content-center',
    'place-items-center',
    'hover:items-start',
  ])('classifies "%s" as shared', (token) => {
    expectShared(token)
  })

  it('classifies "justify-items-start" as utility, not shared (grid-container-only)', () => {
    expectUtility('justify-items-start')
  })
})

describe('ClassClassifier — item (parent-resolved) tokens (#40)', () => {
  it.each([
    'order-1',
    'order-first',
    'order-none',
    'self-end',
    'self-center',
    'place-self-stretch',
    'justify-self-center',
    'justify-self-end',
    'grow',
    'grow-0',
    'shrink',
    'shrink-0',
    'basis-1/2',
    'basis-full',
    'col-span-2',
    'col-start-1',
    'row-span-3',
    'row-end-4',
    'hover:self-end',
  ])('classifies "%s" as item', (token) => {
    expectItem(token)
  })

  it.each(["content-['<']", "content-['>']", 'content-none'])(
    'classifies "%s" as utility, not shared (CSS content property, not flex/grid content-*)',
    (token) => {
      expectUtility(token)
    },
  )

  it.each(["before:content-['<']", "after:content-['>']"])(
    'classifies "%s" as utility with prefix stripped (pseudo-element content)',
    (token) => {
      expectUtility(token, token.slice(token.indexOf(':') + 1))
    },
  )
})

describe('ClassClassifier — conditional tokens', () => {
  it.each<[string, 'flex' | 'grid']>([
    ['[&.flex]:flex-col', 'flex'],
    ['[&.flex]:items-center', 'flex'],
    ['[&.grid]:grid-cols-3', 'grid'],
  ])('classifies "%s" as conditional requires %s', (token, requires) => {
    expectConditional(token, requires)
  })
})

describe('ClassClassifier — utility tokens', () => {
  it.each([
    ['rounded', 'rounded'],
    ['flex-col', 'flex-col'],
    ['grid-cols-3', 'grid-cols-3'],
    ['auto-cols-fr', 'auto-cols-fr'],
    ['hover:flex-col', 'flex-col'],
    ['data-[orientation=horizontal]:flex-row', 'flex-row'],
    ['data-[foo:bar]:grid-cols-3', 'grid-cols-3'],
    ['[&>div]:flex-row', 'flex-row'],
  ])('classifies "%s" as utility with base "%s"', (token, base) => {
    expectUtility(token, base)
  })
})

describe('ClassClassifier — advanced pattern reference (Advanced-Tailwind-Patterns.md)', () => {
  it.each([
    // Arbitrary child selectors
    ['[&>h2]:text-2xl', 'text-2xl'],
    ['[&>h2]:font-bold', 'font-bold'],
    ['[&_a]:underline', 'underline'],
    ['[&_img]:rounded-lg', 'rounded-lg'],
    // :has() selectors — inner colons stay inside bracket depth
    ['[&:has(>img)]:p-0', 'p-0'],
    ['[&:has(footer)]:pb-0', 'pb-0'],
    ['[&:has(input:checked)]:bg-green-100', 'bg-green-100'],
    ['[body:has(dialog[open])_&]:blur-sm', 'blur-sm'],
    // Named groups
    ['group-hover/sidebar:bg-black', 'bg-black'],
    ['group-hover/navitem:text-white', 'text-white'],
    // Arbitrary group selectors
    ['group-[.is-selected]:font-bold', 'font-bold'],
    // Data attribute variants
    ['data-[state=open]:opacity-100', 'opacity-100'],
    ['data-[selected]:font-bold', 'font-bold'],
    ['data-[loading=true]:animate-pulse', 'animate-pulse'],
    // ARIA variants
    ['aria-selected:bg-blue-500', 'bg-blue-500'],
    ['aria-expanded:rotate-180', 'rotate-180'],
    ['aria-disabled:opacity-50', 'opacity-50'],
    // Container queries
    ['@lg:grid-cols-3', 'grid-cols-3'],
    ['@max-md:flex-col', 'flex-col'],
    // Parent-to-child composition
    ['[&>*]:rounded-lg', 'rounded-lg'],
    ['[&>*]:p-4', 'p-4'],
    ['[&>*:not(:last-child)]:border-b', 'border-b'],
    ['[&>section+section]:mt-8', 'mt-8'],
    // Deep descendant matching
    ['[&_svg]:size-4', 'size-4'],
    ['[&_svg_path]:fill-current', 'fill-current'],
    ['[&_button:hover]:bg-red-500', 'bg-red-500'],
    // Full arbitrary selectors
    ['[&>article:nth-child(odd):has(img)_.title]:text-red-500', 'text-red-500'],
  ])('classifies "%s" as utility with base "%s"', (token, base) => {
    expectUtility(token, base)
  })

  it.each<[string, LayoutKey<typeof layoutKeys>]>([
    // Arbitrary group selectors
    ['group-[.active]:block', 'block'],
    // Arbitrary peer selectors — colon inside brackets ignored
    ['peer-[:nth-of-type(3)_&]:block', 'block'],
    // Arbitrary breakpoints
    ['min-[712px]:block', 'block'],
    ['max-[887px]:hidden', 'hidden'],
    ['min-[420px]:max-[900px]:flex', 'flex'],
  ])('classifies "%s" as layout %s', (token, value) => {
    expectLayout(token, value)
  })

  it('classifies "@container" as utility (no separator, base is full token)', () => {
    expectUtility('@container')
  })

  it.each([
    // CSS variables as values — no top-level colon, base is full token
    'w-[--sidebar-width]',
    'h-[--header-height]',
    'bg-[--surface]',
    // Arbitrary CSS properties — colon fully enclosed in brackets
    '[mask-image:linear-gradient(...)]',
    '[scrollbar-gutter:stable]',
    '[text-wrap:balance]',
    '[container-type:inline-size]',
    // Container units — no colon at all
    'w-[50cqw]',
    'h-[25cqh]',
  ])('classifies "%s" as utility with base equal to the full token', (token) => {
    expectUtility(token)
  })
})

describe('ClassClassifier — raw preservation', () => {
  it('raw always equals the original token', () => {
    const tokens = [
      'flex',
      'inline-flex',
      'grid',
      'inline-grid',
      'block',
      'hidden',
      'gap-4',
      'hover:flex-col',
      '[&.flex]:items-start',
    ]
    iterate.forEach(tokens, (token) => {
      expect(c.classify(token).raw).toBe(token)
    })
  })
})
