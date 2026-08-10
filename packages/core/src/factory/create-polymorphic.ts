import { makeResolveTag, mergeProps } from '@praxis-kit/primitive'
import { AriaPolicyEngine } from '@praxis-kit/contract'
import { createClassPipeline } from '@praxis-kit/styling'
import { definePipeline } from '@praxis-kit/pipeline-kit'
import type { PipelineFactory } from '@praxis-kit/pipeline-kit'
import type { ChildrenEvaluator } from '../children'
import type {
  AnyClassPluginFactory,
  AnyRecord,
  AriaPipelineResult,
  AriaRule,
  ClassName,
  ClassPipelineArgs,
  ClassPipelineOptions,
  ElementType,
  EmptyRecord,
  FactoryOptions,
  IntrinsicProps,
  PluginInstance,
  PolymorphicRuntime,
  PropNormalizer,
  RecipeMap,
  RenderPipeline,
  ResolvedFactoryShape,
  VariantMap,
} from '../types'
import { resolveFactoryOptions, validateFactoryOptions, validateRenderProps } from '../options'
import { HTML_ARIA_RULES } from '../html'
import { getHtmlPropNormalizers, getHtmlChildrenEvaluator } from '../html'
import { assertPluginShape, guardPipeline } from './plugin-invariants'

declare const process: { env: { NODE_ENV: string } }

// Each render-time concern (tag, props, HTML prop normalizers, classes, aria) is expressed as a
// PipelineFactory from @praxis-kit/pipeline-kit, so every stage shares the same memoization and
// composition model — none is inlined ad hoc, and none needs a bespoke construction path of its
// own.

const createTagPipeline: RenderPipeline<[ElementType | undefined], ElementType> = (resolved) =>
  makeResolveTag(resolved.defaultTag)

const createPropsPipeline: RenderPipeline<[AnyRecord], AnyRecord> = (resolved) => (props) =>
  mergeProps(resolved.defaultProps, props)

// getHtmlPropNormalizers is a static, tag-keyed lookup — it has no dependency on `resolved` at
// all (the chart's own legend notes ①②③ are keyed by tag, not by a component's resolved config,
// so there's nothing to memoize per-component the way createClassPipeline resolves variants
// once). It's still built through the same PipelineFactory + definePipeline template as every
// other segment, for consistency, rather than being handed out as a bare module reference.
const createHtmlPropNormalizersPipeline: RenderPipeline<
  [tag: unknown],
  readonly PropNormalizer[] | undefined
> = () => getHtmlPropNormalizers

// getHtmlChildrenEvaluator is the same shape as getHtmlPropNormalizers — a static, tag-keyed
// lookup with no dependency on `resolved`. Built through the same template for consistency.
const createHtmlChildrenEvaluatorPipeline: RenderPipeline<
  [tag: unknown],
  ChildrenEvaluator | undefined
> = () => getHtmlChildrenEvaluator

const createStylingClassPipeline: PipelineFactory<
  ClassPipelineOptions<VariantMap>,
  ClassPipelineArgs,
  string | undefined
> = (resolved) => createClassPipeline(resolved)

function resolveAriaRules(resolved: ResolvedFactoryShape): readonly AriaRule[] {
  return [...new Set<AriaRule>([...HTML_ARIA_RULES, ...(resolved.ariaRules ?? [])])]
}

const createAriaPipeline: RenderPipeline<[ElementType, IntrinsicProps], AriaPipelineResult> = (
  resolved,
) => {
  const rules = resolveAriaRules(resolved)
  const engine = new AriaPolicyEngine(resolved.diagnostics, rules.length ? { rules } : undefined)
  return (tag, props) => engine.validate(tag, props)
}

const memoizedTagPipeline = definePipeline(createTagPipeline)
const memoizedPropsPipeline = definePipeline(createPropsPipeline)
const memoizedHtmlPropNormalizersPipeline = definePipeline(createHtmlPropNormalizersPipeline)
const memoizedHtmlChildrenEvaluatorPipeline = definePipeline(createHtmlChildrenEvaluatorPipeline)
const memoizedClassPipeline = definePipeline(createStylingClassPipeline)
const memoizedAriaPipeline = definePipeline(createAriaPipeline)

function resolveAriaPassthrough<P extends IntrinsicProps>(_tag: ElementType, props: P) {
  return { props }
}

function resolveClassPlugin(
  factory: AnyClassPluginFactory,
  resolved: ClassPipelineOptions<VariantMap>,
  diagnostics: ResolvedFactoryShape['diagnostics'],
) {
  if (!factory) return { pluginResult: undefined, classPipeline: memoizedClassPipeline(resolved) }

  const pluginResult = factory(resolved, diagnostics)
  assertPluginShape(pluginResult)
  return { pluginResult, classPipeline: guardPipeline(pluginResult.pipeline) }
}

export function createPolymorphic<
  TDefault extends ElementType,
  Props extends AnyRecord,
  Variants extends Readonly<VariantMap>,
  TPreset extends RecipeMap<Variants> = Readonly<EmptyRecord>,
  TPlugin extends AnyClassPluginFactory = AnyClassPluginFactory,
>(
  options: FactoryOptions<TDefault, Props, Variants, TPreset, TPlugin> = {},
): PolymorphicRuntime<
  TDefault,
  Props,
  Variants,
  Extract<keyof TPreset, string>,
  TPreset,
  PluginInstance<TPlugin>
> {
  const baseResolved = resolveFactoryOptions(options)
  // Cast to the module-level pipelines' shared, non-generic resolved shape — same relationship
  // as createClassPipeline's ClassPipelineOptions<VariantMap> accepting any concrete VariantMap.
  const anyBaseResolved = baseResolved as unknown as ResolvedFactoryShape
  const resolved = Object.freeze({
    ...baseResolved,
    htmlPropNormalizersFn: memoizedHtmlPropNormalizersPipeline(anyBaseResolved),
    htmlChildrenEvaluatorFn: memoizedHtmlChildrenEvaluatorPipeline(anyBaseResolved),
  })
  const anyResolved = resolved as unknown as ResolvedFactoryShape

  if (process.env.NODE_ENV !== 'production') {
    validateFactoryOptions(resolved, resolved.diagnostics)
  }

  const { pluginResult, classPipeline } = resolveClassPlugin(
    options.styling?.plugin as AnyClassPluginFactory,
    anyResolved,
    resolved.diagnostics,
  )
  const resolveTag = memoizedTagPipeline(anyResolved)
  const resolveProps = memoizedPropsPipeline(anyResolved)
  const resolveAriaFn =
    options.enforcement !== undefined ? memoizedAriaPipeline(anyResolved) : resolveAriaPassthrough

  const methods = {
    resolveTag,

    resolveProps,

    resolveClasses(tag: ElementType, props: AnyRecord, className?: ClassName, recipe?: string) {
      if (process.env.NODE_ENV !== 'production') {
        validateRenderProps(resolved.diagnostics, resolved, props, recipe)
      }
      // An empty string here would render as a bare `class` (or `class=""`) attribute on the
      // host element instead of omitting it — normalize to undefined so every adapter's "no
      // class attribute" path (JSX omission, Svelte's set_attribute, Lit/Web's removeAttribute)
      // is the one that fires, regardless of which styling plugin produced the empty result.
      return classPipeline(tag, props, className, recipe) || undefined
    },

    resolveAria<P extends IntrinsicProps>(tag: ElementType, props: P) {
      return resolveAriaFn(tag, props) as { props: P }
    },
  }

  const runtimeObject = pluginResult
    ? { ...methods, options: resolved, hasStyling: true as const, classPlugin: pluginResult }
    : { ...methods, options: resolved }

  return runtimeObject as unknown as PolymorphicRuntime<
    TDefault,
    Props,
    Variants,
    Extract<keyof TPreset, string>,
    TPreset,
    PluginInstance<TPlugin>
  >
}
