/**
 * Compile-time regression tests for `ResolvedSlotProps<G>`/`GenericsOf<T>`
 * (`resolved-slot-props.ts`). Confirms a real bundle's `G` is recoverable from its own value type
 * with no marker (unlike React's/Preact's `__generics`), and that the resulting
 * `ResolvedSlotProps<G>` is a real, usable shape a snippet can be typed against — replacing the
 * bare `Record<string, unknown>` `createRawSnippet<[Record<string, unknown>]>(...)` calls used
 * elsewhere in this adapter's tests (e.g. `Polymorphic.test.ts`) before this type existed.
 *
 * No runtime assertions — `expectTypeOf`/`@ts-expect-error` only.
 */
import { describe, it, expectTypeOf } from 'vitest'
import { createRawSnippet } from 'svelte'
import type { PropsOf } from '@praxis-kit/core'
import { createContractComponent } from '../create-contract-component'
import type { AnyBuiltRuntime } from './built-runtime'
import type { GenericsOf, ResolvedSlotProps } from './resolved-slot-props'

describe('GenericsOf<T>', () => {
  it('recovers a real bundle’s own props, not the widest PolymorphicGenerics fallback', () => {
    // `Props` isn't inferred from `defaults` alone — `FactoryOptions.defaults` is typed
    // `Partial<NoInfer<Props>>` specifically so contract-props inference goes through the
    // explicit `Props` type argument, not the defaults object's own shape (see NoInfer's usage
    // note in lib/primitive). An explicit `Props` argument here is what a real strongly-typed
    // component author would write.
    const buttonBundle = createContractComponent<'button', { type?: string }>({
      tag: 'button',
      defaults: { type: 'button' },
    })
    void buttonBundle
    type ButtonG = GenericsOf<typeof buttonBundle>
    type SlotProps = ResolvedSlotProps<ButtonG>

    expectTypeOf<SlotProps>().not.toBeNever()
    expectTypeOf<SlotProps>().toHaveProperty('type')
    expectTypeOf<SlotProps>().toHaveProperty('class')
  })

  it('recovers the exact G, not merely some PolymorphicGenerics — checked against PropsOf directly', () => {
    // A distinctive property PropsOf<PolymorphicGenerics> (the widest fallback) could never have,
    // so this only passes if GenericsOf<T> actually threaded the real, specific G through the
    // conditional-type inference rather than silently falling back. Optional, not required — a
    // required own prop makes the bundle's own onElement.getProps parameter type invariant in a
    // way that breaks assignability to the AnyBuiltRuntime constraint entirely, a separate,
    // pre-existing generic-variance concern unrelated to what this test is checking.
    const cardBundle = createContractComponent<'div', { distinctiveOwnProp?: true }>({
      tag: 'div',
    })
    void cardBundle
    type CardProps = PropsOf<GenericsOf<typeof cardBundle>>

    expectTypeOf<CardProps>().toHaveProperty('distinctiveOwnProp')
  })

  it('falls back to the widest PolymorphicGenerics for a non-praxis-kit bundle, not never', () => {
    // The regression this guards against: BuiltRuntime<G, TOptions>'s conditional inference
    // silently breaking and collapsing to `never` — which would only surface the moment someone
    // tries to annotate a snippet with it, nowhere near where the actual breakage occurred.
    type Fallback = GenericsOf<AnyBuiltRuntime>

    expectTypeOf<Fallback>().not.toBeNever()
  })
})

describe('ResolvedSlotProps<G>', () => {
  it('is mechanically free of ref/role/style, not merely by doc-comment claim', () => {
    // buildSlotProps (Polymorphic.svelte) genuinely forwards these at runtime when present —
    // this only proves they're absent from the TYPE, matching the documented reasoning in
    // resolved-slot-props.ts (every representation is either unsafe to spread or misrepresents
    // what the runtime actually forwards). A caller who needs one still can, via an explicit,
    // locally-scoped cast — this test guards the omission itself, not reachability workarounds.
    type SlotProps = ResolvedSlotProps<GenericsOf<AnyBuiltRuntime>>

    expectTypeOf<SlotProps>().not.toHaveProperty('ref')
    expectTypeOf<SlotProps>().not.toHaveProperty('role')
    expectTypeOf<SlotProps>().not.toHaveProperty('style')
  })

  it('types a real createRawSnippet call, replacing a bare Record<string, unknown>', () => {
    const buttonBundle = createContractComponent({ tag: 'button' })
    void buttonBundle

    // Previously this call site's only option was
    // createRawSnippet<[Record<string, unknown>]>(...) — no type checking on the snippet
    // parameter at all. This must compile with the real, recovered shape instead.
    const _children = createRawSnippet<[ResolvedSlotProps<GenericsOf<typeof buttonBundle>>]>(
      (getProps) => ({
        render: () => `<a href="/foo">${String(getProps().class ?? '')}</a>`,
      }),
    )
    void _children
  })
})
