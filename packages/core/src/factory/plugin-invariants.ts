import type { AnyRecord, ClassPlugin, ClassPipelineFn } from '../types'
import { throwDiagnostics } from '@praxis-kit/diagnostics'
import { PluginDiagnostics } from './plugin-diagnostics'
import { isFunction, isNull, isObject, isString } from '@praxis-kit/primitive'

// Bundlers (esbuild, Rollup, webpack) replace process.env.NODE_ENV with a string literal,
// enabling dead-code elimination of the dev guard in production builds.
declare const process: { env: { NODE_ENV: string } }

export function assertPluginShape(result: unknown): asserts result is ClassPlugin {
  if (isNull(result) || !isObject(result))
    throwDiagnostics.error(PluginDiagnostics.invalidShape(result))
  const plugin = result as AnyRecord
  if (!isFunction(plugin.pipeline)) throwDiagnostics.error(PluginDiagnostics.invalidShape(result))
}

export function guardPipeline(pipeline: ClassPipelineFn): ClassPipelineFn {
  if (process.env.NODE_ENV === 'production') return pipeline
  return function guardedPipeline(tag, props, className, recipe) {
    const result = pipeline(tag, props, className, recipe)
    if (!isString(result)) throwDiagnostics.error(PluginDiagnostics.pipelineReturnType(result))
    return result
  }
}
