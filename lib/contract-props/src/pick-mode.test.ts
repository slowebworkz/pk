import { describe, it, expectTypeOf } from 'vitest'
import type { PickMode } from './pick-mode'

describe('PickMode', () => {
  it("selects TNormal for 'normal'", () => {
    expectTypeOf<PickMode<'normal', 'N', 'A', 'R'>>().toEqualTypeOf<'N'>()
  })

  it("selects TAsChild for 'asChild'", () => {
    expectTypeOf<PickMode<'asChild', 'N', 'A', 'R'>>().toEqualTypeOf<'A'>()
  })

  it("selects TRender for 'render'", () => {
    expectTypeOf<PickMode<'render', 'N', 'A', 'R'>>().toEqualTypeOf<'R'>()
  })

  it('distributes over a Mode union — the conditional is deliberately distributive', () => {
    expectTypeOf<PickMode<'normal' | 'render', 'N', 'A', 'R'>>().toEqualTypeOf<'N' | 'R'>()
  })

  it('resolves to never for an unsupported slot, matching an adapter missing a mode', () => {
    expectTypeOf<PickMode<'render', 'N', 'A', never>>().toEqualTypeOf<never>()
  })
})
