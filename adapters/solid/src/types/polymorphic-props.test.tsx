/**
 * Compile-time regression tests for `PolymorphicComponent<G>`'s two-overload shape
 * (`polymorphic-props.ts`):
 *
 *   <TAs extends ElementType = DefaultOf<G>>(props: PolymorphicProps<G, TAs>): JSX.Element
 *   (props: PolymorphicProps<G, DefaultOf<G>>): JSX.Element
 *
 * The second, non-generic overload exists purely so `ComponentProps<typeof Component>`-style
 * extraction (Solid's `ComponentProps` conditional type resolves an overloaded function type
 * against its *last* overload) lands on a real, usable shape instead of an unresolved generic —
 * see that overload's own doc comment.
 * A refactor that reorders these, drops the second one, or changes what it's anchored to can
 * silently make `ComponentProps<typeof Component>` resolve to `never`/`unknown` or the wrong
 * element's props without any runtime symptom at all, so this file exists to catch that at
 * typecheck time specifically, independent of the ordinary render tests in
 * `create-contract-component.test.tsx`.
 *
 * No runtime assertions — `expectTypeOf`/`@ts-expect-error`/real JSX that must compile only.
 */
import { describe, it, expectTypeOf } from 'vitest'
import type { ComponentProps, JSX } from 'solid-js'
import { createContractComponent } from '../create-contract-component'

describe('PolymorphicComponent<G> overload ordering', () => {
  it('ComponentProps<typeof Component> resolves to the default element’s own shape, not never/unknown', () => {
    const Button = createContractComponent({ tag: 'button' })
    void Button
    type ButtonProps = ComponentProps<typeof Button>

    // PolymorphicProps<G, TAs> unions the normal-mode and asChild-mode shapes (Solid folds both
    // into one type rather than splitting them the way React/Preact do — see ContractProps<G>'s
    // own doc comment) — keyof a union only keeps keys common to every member, so onClick/disabled
    // aren't reachable off the union directly. Extract<..., { asChild?: false }> isolates the
    // normal-mode branch, where the default element's own intrinsic props actually live.
    type NormalModeProps = Extract<ButtonProps, { asChild?: false }>

    expectTypeOf<ButtonProps>().not.toBeNever()
    // The default element is 'button' — its own intrinsic props (onClick, disabled) must be
    // reachable through the extracted normal-mode shape, confirming extraction landed on the
    // fallback overload's real PolymorphicProps<G, DefaultOf<G>> instantiation, not a bare
    // generic left unresolved.
    expectTypeOf<NormalModeProps>().toHaveProperty('onClick')
    expectTypeOf<NormalModeProps>().toHaveProperty('disabled')
  })

  it('ComponentProps extraction stays anchored to the default element, not just any usable shape', () => {
    const Button = createContractComponent({ tag: 'button' })
    void Button
    type ButtonProps = ComponentProps<typeof Button>
    type NormalModeProps = Extract<ButtonProps, { asChild?: false }>

    // Guards against the fallback overload silently drifting off DefaultOf<G> while remaining
    // "usable" in some other, wrong-element shape — disabled/onClick alone can't catch that,
    // since a broader ElementType fallback could plausibly carry both too.
    expectTypeOf<NormalModeProps>().toHaveProperty('disabled')
    // @ts-expect-error — href belongs to <a>, not <button>; presence here would mean extraction
    // drifted off DefaultOf<G> = 'button'.
    expectTypeOf<NormalModeProps>().toHaveProperty('href')
  })

  it('ComponentProps extraction retains the asChild branch and its ResolvedSlotProps contract', () => {
    const Button = createContractComponent({ tag: 'button' })
    void Button
    type ButtonProps = ComponentProps<typeof Button>
    type AsChildModeProps = Extract<ButtonProps, { asChild: true }>

    expectTypeOf<AsChildModeProps>().toHaveProperty('children')
    // The full path: ComponentProps -> PolymorphicProps -> AsChildProps -> SlotRenderFn<G> ->
    // ResolvedSlotProps<G>. A real JSX call site exercises this end to end below.
  })

  it('a real asChild call site type-checks the full ComponentProps -> ResolvedSlotProps path', () => {
    const Button = createContractComponent({ tag: 'button' })
    const _el: JSX.Element = <Button asChild>{(props) => <a {...props} href="/foo" />}</Button>
    void _el
  })

  it('a bare call with no `as` accepts the default element’s own intrinsic props', () => {
    const Button = createContractComponent({ tag: 'button' })
    // No `as` — must accept <button>'s own intrinsic props (`type`), matching DefaultOf<G>.
    const _el: JSX.Element = <Button type="submit">Save</Button>
    void _el
  })

  it('an explicit `as` still gets that element’s own intrinsic props through the generic overload', () => {
    const Link = createContractComponent({ tag: 'button' })
    // `as="a"` switches the accepted intrinsic props to <a>'s own (`href`), proving the first,
    // generic overload — not just the fallback — is still what a real call site resolves against.
    const _el: JSX.Element = (
      <Link as="a" href="/foo">
        Go
      </Link>
    )
    void _el
  })

  it('an explicit `as` rejects the wrong element’s intrinsic props', () => {
    const Link = createContractComponent({ tag: 'button' })
    const _el: JSX.Element = (
      // @ts-expect-error — href is <a>-specific, not valid once `as="section"` switches the target.
      <Link as="section" href="/foo">
        Go
      </Link>
    )
    void _el
  })
})
