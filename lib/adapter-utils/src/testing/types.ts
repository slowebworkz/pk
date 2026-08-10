import type {
  AnyRecord,
  ChildRuleContext,
  FactoryOptions,
  Rule,
  VariantMap,
} from '@praxis-kit/core'
import type { StringMap } from '@praxis-kit/primitive'
import type { Diagnostics } from '@praxis-kit/diagnostics'

/**
 * A maximally-wide FactoryOptions shape used as the bridge cast in adapter
 * conformance tests. ConformanceFactoryOptions uses simplified field types
 * (e.g. `defaults?: Record<string, string>`) that don't satisfy FactoryOptions'
 * constrained generics (`Partial<VariantProps<V>>`, `TPreset extends RecipeMap<V>`).
 * Casting through this alias makes the intent explicit rather than using
 * `Parameters<typeof createContractComponent>[0]`.
 */
export type BareFactoryOptions = FactoryOptions<string, AnyRecord, Readonly<VariantMap>>

// Component returned by createComponent — must carry displayName.
export type ConformanceComponent = { displayName?: string }

// Mutable ref object — same shape as React.createRef / Preact.createRef.
export type ConformanceRef = { current: HTMLElement | null }

export type ChildSpec =
  | { tag: string; props?: AnyRecord; children?: ChildSpec[] }
  | { component: ConformanceComponent; props?: AnyRecord; children?: ChildSpec[] }

export type RenderResult = {
  /** The current root DOM element. Always reflects the latest render/rerender. */
  readonly element: HTMLElement
  /** Re-render the same component with new props and/or children. */
  rerender(props?: AnyRecord, children?: ChildSpec[]): void
  /** Unmount the component from the DOM. */
  unmount(): void
}

export type ConformanceFactoryOptions = {
  tag?: string
  name?: string
  styling?: {
    base?: string
    variants?: StringMap<StringMap<string>>
    defaults?: StringMap<string>
    compounds?: ReadonlyArray<StringMap<string> & { class: string }>
    presets?: AnyRecord
  }
  filterProps?: (key: string, variantKeys: ReadonlySet<string>) => boolean
  enforcement?: {
    diagnostics?: Diagnostics
    children?: ReadonlyArray<{
      name: string
      match: (c: unknown) => c is unknown
      cardinality?: Rule<{ min?: number; max?: number }, ChildRuleContext>
    }>
  }
}

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
   * Declare which optional contracts this adapter satisfies.
   * Unset fields default to true — only set false to opt out.
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
     * true if this adapter supports server-side rendering via ssrConformanceSuite.
     * Informational — wire ssrConformanceSuite separately in a node-environment test file.
     */
    ssr?: boolean
    /**
     * true if this adapter supports hydration parity via hydrationParitySuite.
     * Informational — wire hydrationParitySuite separately in a jsdom-environment test file.
     */
    hydration?: boolean
    /**
     * true if this adapter's render path passes a `ChildRuleContext` (resolved
     * tag/props) into `childrenEvaluator.evaluate()`, so a `dynamic(...)`
     * child-rule cardinality (e.g. varying by the resolved `as` tag) is
     * actually resolved rather than throwing for lack of context.
     * Unset (default false) — opt in per adapter as each is wired.
     */
    dynamicChildRules?: boolean
  }
}
