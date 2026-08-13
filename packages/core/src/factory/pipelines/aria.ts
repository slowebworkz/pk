import { AriaPolicyEngine } from '@praxis-kit/contract'
import { definePipeline } from '@praxis-kit/pipeline-kit'
import type {
  AriaPipelineResult,
  AriaRule,
  ElementType,
  IntrinsicProps,
  RenderPipeline,
  ResolvedFactoryShape,
} from '../../types'
import { HTML_ARIA_RULES } from '../../html'

// ARIA enforcement is policy construction, not generic pipeline plumbing — it owns the
// always-on HTML rule set, a caller's extra `ariaRules`, and the AriaPolicyEngine instance that
// evaluates them. Kept separate from ./pipelines so createPolymorphic doesn't need to know how
// enforcement is built, only whether to install it.

function resolveAriaRules(resolved: ResolvedFactoryShape): readonly AriaRule[] {
  return [...new Set<AriaRule>([...HTML_ARIA_RULES, ...(resolved.ariaRules ?? [])])]
}

export const createAriaPipeline: RenderPipeline<
  [ElementType, IntrinsicProps, IntrinsicProps?],
  AriaPipelineResult
> = (resolved) => {
  const rules = resolveAriaRules(resolved)
  const engine = new AriaPolicyEngine(resolved.diagnostics, rules.length ? { rules } : undefined)
  return (tag, props, extraProps) => engine.validate(tag, props, extraProps)
}

export const memoizedAriaPipeline = definePipeline(createAriaPipeline)

// Used in place of memoizedAriaPipeline's result when a component has no `enforcement` option
// configured at all — a no-op that echoes props back unchanged, keeping resolveAria's shape
// uniform regardless of whether enforcement is active.
export function resolveAriaPassthrough<P extends IntrinsicProps>(
  _tag: ElementType,
  props: P,
  _extraProps?: IntrinsicProps,
) {
  return { props }
}
