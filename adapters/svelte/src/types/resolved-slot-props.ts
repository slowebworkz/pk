import type { OmitIndexSignature } from 'type-fest'
import type { PolymorphicGenerics, PropsOf, VariantProps, VariantsOf } from '@praxis-kit/core'
import type { AnyBuiltRuntime, BuiltRuntime, WithChildRules } from './built-runtime'

/**
 * Recovers a bundle's `PolymorphicGenerics` descriptor from its own value type — the Svelte
 * analog of React's/Preact's `__generics` marker recovery (`@praxis-kit/contract-props`), but
 * needs no marker at all: `createContractComponent` already returns `BuiltRuntime<G, TOptions>`
 * directly (not an erased type), so `G` is a plain, ordinary type parameter to `infer` back out.
 * The second type argument is fixed to `WithChildRules` (its own upper bound) rather than
 * `infer`'d, since nothing here needs `TOptions` itself, only `G`. Falls back to the widest
 * `PolymorphicGenerics` for any non-praxis-kit bundle, the same "no marker, nothing to recover"
 * case `HasGenerics<G>`'s own `never` branch covers for React/Preact — a caller annotation, not an
 * internal assertion, so a mismatched bundle should degrade gracefully rather than poison the
 * whole expression with `never`.
 */
export type GenericsOf<T extends AnyBuiltRuntime> =
  T extends BuiltRuntime<infer G, WithChildRules> ? G : PolymorphicGenerics

/**
 * The exact props object an `asChild` snippet receives at runtime, once defaults, variant
 * classes, and ARIA role resolution have all run — see `buildSlotProps` in `Polymorphic.svelte`
 * (whose own doc comment covers the runtime-only asymmetries with the non-asChild path, such as
 * skipped event-key normalization, that don't change this type's contract). `<Polymorphic>` itself
 * can't be typed against this directly (its own `children` prop must stay `Snippet<[UnknownProps]>`,
 * erased, since one `.svelte` file/`.d.ts` serves every bundle's `G`) — this type exists for a
 * caller to annotate their own snippet parameter with instead:
 *
 * ```svelte
 * <Polymorphic bundle={buttonBundle} asChild>
 *   {#snippet children(props: ResolvedSlotProps<GenericsOf<typeof buttonBundle>>)}
 *     <a {...props} href="/foo">Go</a>
 *   {/snippet}
 * </Polymorphic>
 * ```
 *
 * `PropsOf<G>` stays `Partial` for the same reason it does in every other adapter's asChild-mode
 * type: the type system can't prove every prop actually received a default, only that the runtime
 * *tried*. `VariantProps<VariantsOf<G>>` needs no extra `Partial` wrapper — it's already fully
 * optional at its own definition (`{ [K in keyof V]?: ... }`). `class` is narrowed to a plain
 * resolved `string`.
 *
 * Three fields other adapters' `ResolvedSlotProps<G>` carry, or a caller might expect, are
 * deliberately absent here rather than given an explicit (and unsafe) type — omitting a key
 * entirely keeps `{...props}` spreads onto a real element honest and compiling; reading one of
 * these off the object directly needs an explicit, locally-scoped cast instead:
 * - `ref` — Svelte has no `ref` prop concept (DOM access is via `bind:this`/`onElement`); a caller
 *   who writes a literal `ref` key gets it forwarded like any other unknown prop, untyped.
 * - `role` — same reasoning Solid's `ResolvedSlotProps<G>` documents: every candidate type is
 *   either too wide to spread onto an unknown target element's own narrower per-element `role`
 *   union, or (`unknown`) fails that same assignability check outright, the same way `unknown`
 *   would for `style` below.
 * - `style` — unlike the non-asChild `<svelte:element>` path (`buildDomProps`), the asChild path
 *   skips `style`-object serialization entirely: a caller's `style` prop passes through however
 *   they wrote it (object or string), so there's no one shape to assert here either.
 */
export type ResolvedSlotProps<G extends PolymorphicGenerics> = Partial<
  OmitIndexSignature<PropsOf<G>>
> &
  OmitIndexSignature<VariantProps<VariantsOf<G>>> & {
    class?: string | undefined
  }
