import type { PipelineFactory } from '@praxis-kit/pipeline-kit'
import { definePipeline } from '@praxis-kit/pipeline-kit'
import { makeResolveTag, mergeProps } from '@praxis-kit/primitive'
import { createClassPipeline } from '@praxis-kit/styling'
import type { ChildrenEvaluator } from '../../children'
import { getHtmlChildrenEvaluator, getHtmlPropNormalizers } from '../../html'
import type {
  AnyRecord,
  ClassPipelineArgs,
  ClassPipelineOptions,
  ElementType,
  PropNormalizer,
  RenderPipeline,
  VariantMap,
} from '../../types'

// Each render-time concern (tag, props, HTML prop normalizers, children evaluation, classes)
// is constructed as a PipelineFactory, so every stage shares the same memoization and
// composition model. ARIA/enforcement lives in ./aria-pipeline because it has additional
// policy-construction semantics beyond the generic pipeline plumbing here.

export const createTagPipeline: RenderPipeline<[ElementType | undefined], ElementType> = (
  resolved,
) => makeResolveTag(resolved.defaultTag)

export const createPropsPipeline: RenderPipeline<[AnyRecord], AnyRecord> = (resolved) => (props) =>
  mergeProps(resolved.defaultProps, props)

// Static tag-keyed lookup. It participates in the pipeline model for consistency, although it
// has no component-level resolved configuration dependencies.
export const createHtmlPropNormalizersPipeline: RenderPipeline<
  [tag: unknown],
  readonly PropNormalizer[] | undefined
> = () => getHtmlPropNormalizers

// Static tag-keyed lookup; no resolved configuration is required.
export const createHtmlChildrenEvaluatorPipeline: RenderPipeline<
  [tag: unknown],
  ChildrenEvaluator | undefined
> = () => getHtmlChildrenEvaluator

// Deliberately PipelineFactory<ClassPipelineOptions<VariantMap>, ...>, not RenderPipeline —
// createClassPipeline's own contract is ClassPipelineOptions<VariantMap>, a narrower shape than
// ResolvedFactoryShape (it lacks defaultTag/diagnostics/variantKeys, which are always present on
// a real ResolvedFactoryShape but aren't guaranteed by every ClassPipelineOptions caller, e.g.
// resolveClassPlugin's own `resolved` parameter). Forcing this to RenderPipeline would make
// resolveClassPlugin's call into memoizedClassPipeline a type error under
// exactOptionalPropertyTypes — the two resolved shapes aren't interchangeable here.
export const createStylingClassPipeline: PipelineFactory<
  ClassPipelineOptions<VariantMap>,
  ClassPipelineArgs,
  string | undefined
> = (resolved) => createClassPipeline(resolved)

export const memoizedTagPipeline = definePipeline(createTagPipeline)
export const memoizedPropsPipeline = definePipeline(createPropsPipeline)
export const memoizedHtmlPropNormalizersPipeline = definePipeline(createHtmlPropNormalizersPipeline)
export const memoizedHtmlChildrenEvaluatorPipeline = definePipeline(
  createHtmlChildrenEvaluatorPipeline,
)
export const memoizedClassPipeline = definePipeline(createStylingClassPipeline)
