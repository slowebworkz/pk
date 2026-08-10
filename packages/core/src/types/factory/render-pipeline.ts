import type { Arguments, PipelineFactory } from '@praxis-kit/pipeline-kit'
import type { ResolvedFactoryShape } from './resolved-factory-shape'

/** A PipelineFactory keyed on the shared `ResolvedFactoryShape` — every render-time mechanism
 *  is expressed through this shape, so each shares the same memoization and composition model
 *  instead of following a bespoke construction path. */
export type RenderPipeline<TArgs extends Arguments, TResult> = PipelineFactory<
  ResolvedFactoryShape,
  TArgs,
  TResult
>
