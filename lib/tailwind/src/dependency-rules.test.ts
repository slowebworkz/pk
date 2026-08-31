import { describe, expect, it } from 'vitest'
import { defaultDependencyRules } from './dependency-rules'

describe('defaultDependencyRules — flex', () => {
  const { flex } = defaultDependencyRules

  it.each(['flex-1', 'flex-auto', 'flex-none', 'flex-col', 'flex-row'])('matches %s', (cls) => {
    expect(flex.some((r) => r.test(cls))).toBe(true)
  })

  // Item properties (grow/shrink/basis, col-*) resolve against the parent's family
  // and are classified as `kind: 'item'` instead — see PRAXIS-KIT-FINDINGS.md #40.
  it.each(['grow', 'grow-0', 'shrink', 'shrink-0', 'basis-0', 'basis-full', 'grid-cols-2', 'gap-4'])(
    'does not match %s',
    (cls) => {
      expect(flex.some((r) => r.test(cls))).toBe(false)
    },
  )
})

describe('defaultDependencyRules — grid', () => {
  const { grid } = defaultDependencyRules

  it.each(['grid-cols-2', 'grid-rows-3', 'grid-flow-row'])('matches %s', (cls) => {
    expect(grid.some((r) => r.test(cls))).toBe(true)
  })

  it.each(['auto-cols-min', 'auto-cols-fr', 'auto-rows-min', 'auto-rows-fr', 'justify-items-center'])(
    'matches %s',
    (cls) => {
      expect(grid.some((r) => r.test(cls))).toBe(true)
    },
  )

  // Item-placement properties (col-*/row-*, justify-self-*) resolve against the
  // parent's family and are classified as `kind: 'item'` — #40.
  it.each([
    'col-span-2',
    'col-start-1',
    'row-span-2',
    'row-end-3',
    'justify-self-center',
    'flex-1',
    'grow',
    'shrink',
    'basis-full',
  ])('does not match %s', (cls) => {
    expect(grid.some((r) => r.test(cls))).toBe(false)
  })
})
