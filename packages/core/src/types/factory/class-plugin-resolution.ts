import type { AnyClassPlugin, ClassPipelineArgs } from '../class'

/** The resolved styling pipeline and, when styling is supplied by a plugin, the validated
 *  plugin result that produced it.
 *
 *  Without a plugin, `pluginResult` is `undefined` and `classPipeline` is the built-in memoized
 *  class pipeline. With a plugin, `pluginResult` holds the validated plugin result and
 *  `classPipeline` is its guarded pipeline.
 *
 *  `classPipeline` is typed by its argument tuple (`ClassPipelineArgs`), not `ClassPipelineFn` —
 *  the built-in and plugin-derived pipelines have distinct but compatible function types
 *  (`Pipeline<ClassPipelineArgs, ...>` vs. `ClassPipelineFn`'s looser `tag: unknown` parameter),
 *  and this is the narrower shape both satisfy. */
export type ClassPluginResolution = {
  readonly pluginResult: AnyClassPlugin
  readonly classPipeline: (...args: ClassPipelineArgs) => string | undefined
}
