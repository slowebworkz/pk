import type { AnyRecord, ClassPlugin, ClassPipelineFn } from '../types'
import { throwDiagnostics } from '@praxis-kit/diagnostics'
import { PluginDiagnostics } from './plugin-diagnostics'
import { isFunction, isNull, isObject, isString } from '@praxis-kit/primitive'

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
