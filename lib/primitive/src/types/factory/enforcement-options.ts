import type { ElementType } from '../primitives'
import type { AriaRule } from '../aria-rule'
import type { ChildRuleInput } from '../contracts'
import type { PropNormalizer } from './prop-normalizer'
import type { Diagnostics, DiagnosticsMode } from '@praxis-kit/diagnostics'

export type EnforcementOptions<TAllowed extends ElementType = ElementType> = {
  /**
   * Accepts a preset name (`'warn'`, `'throw'`, `'silent'`) or a full `Diagnostics`
   * instance for custom reporting/policy. The string form needs no import from
   * `@praxis-kit/diagnostics`.
   */
  readonly diagnostics?: Diagnostics | DiagnosticsMode
  /**
   * ARIA/accessibility rules evaluated against the resolved tag and props on every render.
   * Each rule is a function receiving the current context and returning zero or more
   * violations, some of which can carry an auto-applicable fix (see `createRemoveAttributeRule`
   * and friends in `praxis-kit/contract`).
   */
  readonly aria?: readonly AriaRule[]
  /**
   * Rules that need `AriaPolicyEngine`'s fix-application/caching machinery
   * (`AriaRule`'s `readsProps`, fixable `AriaFix` results) but have no
   * relationship to ARIA semantics — an HTML fact or a security check like a
   * dangerous-URL-scheme guard, for example. Evaluated together with `aria`
   * (both run through the same engine, merged into one rule set) — this is a
   * separate bucket purely so a non-ARIA rule doesn't have to sit under the
   * misleading `aria` name to get the machinery it needs.
   */
  readonly rules?: readonly AriaRule[]
  /**
   * Declares which children are valid, by name, match predicate, and cardinality (e.g. "at
   * least 1, at most 4 `Button` children"). Open by default — children matching no rule are
   * still allowed unless `exclusiveChildren` is set.
   */
  readonly children?: readonly ChildRuleInput[]
  /**
   * When true, only children matching a `children` rule (or text, per `allowText`)
   * are valid — anything else is rejected. Default: false (open — children not
   * matching any rule are allowed).
   */
  readonly exclusiveChildren?: boolean
  /**
   * When false, text/number child nodes are rejected regardless of exclusiveChildren
   * or any listed rule. Default: true.
   */
  readonly allowText?: boolean
  /**
   * Prop transforms composed with the component's own `normalize` (from `FactoryOptions`) and
   * run before it. Unlike `normalize`, these live in the enforcement bucket because they
   * typically encode a built-in HTML/ARIA fact rather than component-specific behavior.
   */
  readonly props?: readonly PropNormalizer[]
  /** Restricts the `as` prop to this set of tags. Violations route through diagnostics. */
  readonly allowedAs?: readonly TAllowed[]
}
