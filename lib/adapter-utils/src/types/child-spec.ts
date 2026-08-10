import type { AnyRecord } from '@praxis-kit/core'
import type { Simplify } from 'type-fest'
import type { ConformanceComponent } from './conformance-component'

/** Fields every `ChildSpec` variant shares, regardless of whether the child is a native tag or a
 *  built component. */
type ChildSpecBase = {
  /** Framework-neutral by design — this is a conformance-suite boundary, not an attempt to type
   *  any particular adapter's actual prop shape. See `ConformanceFactoryOptions`'s own note on
   *  the same tradeoff. */
  props?: AnyRecord
  /** Recursive: a `ChildSpec` tree describes nested children the same way at every depth, with
   *  no separate node type needed for "child of a child." */
  children?: ChildSpec[]
}

/** A native/intrinsic element child, identified by tag name (e.g. `'div'`, `'button'`, or a
 *  custom element like `'my-widget'`) — not narrowed to a closed HTML tag union, since a
 *  conformance adapter may legitimately need to describe a custom element too. */
type ElementChildSpec = ChildSpecBase & {
  tag: string
}

/** A built-component child, identified by the component value itself rather than a tag name —
 *  the counterpart an adapter reaches for when the child isn't a plain intrinsic element. */
type ComponentChildSpec = ChildSpecBase & {
  component: ConformanceComponent
}

/**
 * A framework-neutral description of one node in a render tree, for the conformance suite to
 * hand to an adapter's `render()` without knowing anything about that adapter's actual JSX/
 * template representation. `tag` vs. `component` is a structural discriminant — no `kind` field
 * is needed, since the two variants are already distinguishable by which property they carry.
 *
 * Wrapped in `Simplify` once, here, rather than on each intermediate variant — `ElementChildSpec`/
 * `ComponentChildSpec` aren't exported anywhere else, so simplifying them individually would be
 * redundant work for no visible benefit. `Simplify`'s homomorphic mapped type distributes over a
 * union correctly (confirmed: the flattened result still requires `component` on one branch and
 * rejects an object with neither `tag` nor `component`), so one wrap at the exported boundary is
 * both simpler and sufficient — the same convention `PolymorphicProps`/`PolymorphicWithAsChild`
 * use in the React adapter's own `polymorphic-props.ts`.
 *
 * Not a universal representation: Svelte's own `ConformanceAdapter` can't support the
 * `component` variant (children are Svelte snippets, serialised to an HTML string instead — see
 * `ConformanceAdapter`'s own doc comment) and Solid's `asChild` needs a render-function pattern
 * `ChildSpec` can't express either. `ChildSpec` is deliberately the common denominator most
 * adapters share, with framework-specific escape hatches documented on `ConformanceAdapter`
 * rather than folded into this type.
 */
export type ChildSpec = Simplify<ElementChildSpec | ComponentChildSpec>
