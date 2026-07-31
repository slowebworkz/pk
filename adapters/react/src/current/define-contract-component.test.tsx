import { describe, expectTypeOf, it } from 'vitest'
import type { EmptyRecord, PolymorphicGenerics } from '@praxis-kit/core'
import type { PolymorphicComponent } from '../shared'
import { createContractComponent } from './create-contract-component'
import { defineContractComponent } from '@praxis-kit/adapter-utils'

const variants = {
  size: { sm: 'text-sm', lg: 'text-lg' },
  intent: { primary: 'bg-blue-500', ghost: 'bg-transparent' },
} as const

describe('defineContractComponent — React integration', () => {
  it('produces a PolymorphicComponent with the correct generics', () => {
    const createBox = defineContractComponent({
      tag: 'div' as const,
      name: 'Box',
      styling: { variants },
    })

    const Box = createBox(createContractComponent)

    // SPIKE (finding #22): createContractComponent's return type is now
    // `PolymorphicComponent<G> & TSubComponents`, defaulting TSubComponents
    // to EmptyRecord when no subComponents option is passed — structurally
    // a no-op, but expectTypeOf's strict equality sees the intersection.
    type Expected = PolymorphicComponent<PolymorphicGenerics<'div', EmptyRecord, typeof variants>> &
      EmptyRecord
    expectTypeOf(Box).toEqualTypeOf({} as Expected)
  })

  it('preserves tag literal on the component type', () => {
    const createLink = defineContractComponent({ tag: 'a' as const, name: 'Link' })
    const Link = createLink(createContractComponent)

    type Expected = PolymorphicComponent<
      PolymorphicGenerics<'a', EmptyRecord, Readonly<EmptyRecord>>
    > &
      EmptyRecord
    expectTypeOf(Link).toEqualTypeOf({} as Expected)
  })

  it('different calls to the bound factory are independent', () => {
    const createButton = defineContractComponent({
      tag: 'button' as const,
      name: 'Button',
      styling: { variants },
    })

    const ButtonA = createButton(createContractComponent)
    const ButtonB = createButton(createContractComponent)

    type Expected = PolymorphicComponent<
      PolymorphicGenerics<'button', EmptyRecord, typeof variants>
    > &
      EmptyRecord
    expectTypeOf(ButtonA).toEqualTypeOf({} as Expected)
    expectTypeOf(ButtonB).toEqualTypeOf({} as Expected)
  })
})
