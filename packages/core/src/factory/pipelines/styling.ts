import type {
  AnyClassPluginFactory,
  ClassPipelineOptions,
  ClassPluginResolution,
  ResolvedFactoryShape,
  VariantMap,
} from '../../types'
import { memoizedClassPipeline } from './generic'
import { assertPluginShape, guardPipeline } from '../plugin-invariants'

// The styling-plugin boundary: a component either uses the default class pipeline
// (memoizedClassPipeline) or hands construction off to a caller-supplied ClassPluginFactory
// (e.g. createTailwindPipeline). Kept separate from ./pipelines because it also owns validating
// the plugin's returned shape (assertPluginShape) and guarding its pipeline (guardPipeline) —
// that's plugin-contract enforcement, not pipeline construction itself.
export function resolveClassPlugin(
  factory: AnyClassPluginFactory,
  resolved: ClassPipelineOptions<VariantMap>,
  diagnostics: ResolvedFactoryShape['diagnostics'],
): ClassPluginResolution {
  if (!factory) return { pluginResult: undefined, classPipeline: memoizedClassPipeline(resolved) }

  const pluginResult = factory(resolved, diagnostics)
  assertPluginShape(pluginResult)
  return { pluginResult, classPipeline: guardPipeline(pluginResult.pipeline) }
}
