import type { AnyRecord } from '@praxis-kit/core'
import type { ChildSpec } from './child-spec'
import type { ConformanceComponent, ConformanceRef } from './conformance-component'
import type { ConformanceFactoryOptions } from './conformance-factory-options'
import type { RenderResult } from './render-result'

/**
 * Adapter contract for the conformance suite.
 *
 * Generic parameter C is the framework's component type — e.g.
 * `ComponentType<UnknownProps>` for React, `Component<UnknownProps>` for Solid.
 * Providing it lets render() receive a properly typed value without casting.
 * Defaults to ConformanceComponent for adapters that don't need typed dispatch.
 *
 * Notes on framework-specific limitations:
 *   Solid  — asChild uses a render-function pattern (children must be
 *             `(props) => element`), incompatible with ChildSpec. Set
 *             `capabilities.asChild: false` and wire Solid-specific asChild
 *             tests in the adapter directly.
 *   Svelte — createContractComponent returns a BuiltRuntime bundle, not a
 *             component, and children are Svelte snippets. Wire Svelte tests
 *             directly against Polymorphic.svelte. ChildSpec children are
 *             serialised to an HTML string via createRawSnippet; component
 *             ChildSpec nodes are not supported and throw at runtime.
 */
export type ConformanceAdapter<C extends ConformanceComponent = ConformanceComponent> = {
  createComponent(options: ConformanceFactoryOptions): C
  render(component: C, props?: AnyRecord, children?: ChildSpec[]): RenderResult
  setup(): void
  cleanup(): void
  /**
   * Optional: provide to enable ref-forwarding tests.
   * Return a mutable `{ current: null }` object populated after render
   * (e.g. React.createRef / Preact.createRef).
   */
  createRef?(): ConformanceRef
  /**
   * Declare which optional *behavioral* contracts this adapter satisfies.
   * Unset fields default to true unless otherwise documented; set a field to false to opt out.
   * (`dynamicChildRules` is the one exception — see its own doc comment.)
   *
   * Kept separate from `testSuites` below: these four are properties of how the adapter
   * actually renders (does asChild work, does the tag change polymorphically, ...) — the
   * conformance suite itself asserts them. `testSuites` is a different kind of fact (whether a
   * *separate* test file exists that exercises this adapter at all), not something this suite
   * verifies by running these same assertions.
   */
  capabilities?: {
    /** false for Solid, which uses a render-function asChild pattern. */
    asChild?: boolean
    /**
     * false for adapters where the rendered element tag is fixed at registration
     * time (e.g. Lit custom elements). Skips tests that assert element.tagName
     * matches options.tag or the as prop value.
     */
    tagPolymorphism?: boolean
    /**
     * false for adapters where variant keys and filterProps targets remain as
     * DOM attributes (e.g. Lit, where Lit's reactive property system owns the
     * attribute lifecycle). Skips tests that assert those keys are absent from
     * the rendered element's attribute set.
     */
    domPropFiltering?: boolean
    /**
     * true if this adapter's render path passes a `ChildRuleContext` (resolved
     * tag/props) into `childrenEvaluator.evaluate()`, so a `dynamic(...)`
     * child-rule cardinality (e.g. varying by the resolved `as` tag) is
     * actually resolved rather than throwing for lack of context.
     *
     * Unlike the other three capabilities above, this one is opt-in: unset defaults to
     * *false*, not true — the safe default when it's unknown whether an adapter's render path
     * threads the context through, since claiming support silently would let a real gap pass
     * uncaught rather than surface as a skipped test.
     */
    dynamicChildRules?: boolean
  }
  /**
   * Informational only — declares whether a *separate* test file wires this adapter into
   * `ssrConformanceSuite`/`hydrationParitySuite`. Neither flag is read by this suite or any
   * other code; nothing here fails if it's unset or wrong. Distinct from `capabilities` because
   * these aren't behavioral facts this suite verifies by running assertions — they just document,
   * next to the adapter contract itself, whether that separate coverage exists.
   */
  testSuites?: {
    /** true if this adapter supports server-side rendering via ssrConformanceSuite. */
    ssr?: boolean
    /** true if this adapter supports hydration parity via hydrationParitySuite. */
    hydration?: boolean
  }
}
