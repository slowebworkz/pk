import type { ChildRuleContext } from './child-rule-context'

/** Structural counterpart to `@praxis-kit/contract`'s `ChildrenEvaluator` class — `lib/primitive`
 *  may not depend on `lib/contract` (see `primitive-no-upper-layers` in .dependency-cruiser.cjs),
 *  so this describes only the shape consumers actually call. Mirrors `AriaEngine`'s pattern. */
export type ChildrenEvaluator = {
  evaluate: (children: unknown[], context?: ChildRuleContext) => void
}
