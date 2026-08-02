import { describe, expectTypeOf, it } from 'vitest'
import type { AnyFactoryOptions, EmptyRecord, PolymorphicGenerics } from '@praxis-kit/core'
import type { PolymorphicComponent } from './types'
import { createContractComponent } from './create-contract-component'
import { defineContractComponent } from '@praxis-kit/adapter-utils'

const variants = {
  size: { sm: 'text-sm', lg: 'text-lg' },
  intent: { primary: 'bg-blue-500', ghost: 'bg-transparent' },
} as const

describe('defineContractComponent — Solid integration', () => {
  it('produces a PolymorphicComponent with the correct generics', () => {
    const options = {
      tag: 'div' as const,
      name: 'Box',
      styling: { variants },
    } satisfies AnyFactoryOptions

    const Box = defineContractComponent(options)(createContractComponent)

    type Expected = PolymorphicComponent<PolymorphicGenerics<'div', EmptyRecord, typeof variants>>
    expectTypeOf(Box).toEqualTypeOf({} as Expected)
  })

  it('preserves tag literal on the component type', () => {
    const options = { tag: 'a' as const, name: 'Link' } satisfies AnyFactoryOptions
    const Link = defineContractComponent(options)(createContractComponent)

    type Expected = PolymorphicComponent<
      PolymorphicGenerics<'a', EmptyRecord, Readonly<EmptyRecord>>
    >
    expectTypeOf(Link).toEqualTypeOf({} as Expected)
  })

  it('different calls to the bound factory are independent', () => {
    const options = {
      tag: 'button' as const,
      name: 'Button',
      styling: { variants },
    } satisfies AnyFactoryOptions

    const createButton = defineContractComponent(options)
    const ButtonA = createButton(createContractComponent)
    const ButtonB = createButton(createContractComponent)

    type Expected = PolymorphicComponent<
      PolymorphicGenerics<'button', EmptyRecord, typeof variants>
    >
    expectTypeOf(ButtonA).toEqualTypeOf({} as Expected)
    expectTypeOf(ButtonB).toEqualTypeOf({} as Expected)
  })
})
