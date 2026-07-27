import { cn, createClassPipeline } from '@praxis-kit/core'
import { ConsoleReporter, DefaultPolicy, Diagnostics, Severity } from '@praxis-kit/diagnostics'
import { composePipelines } from '@praxis-kit/pipeline-kit'
import { VOID_TAGS, isString, iterate } from '@praxis-kit/primitive'

import { ClassBuilder } from './class-builder'
import { ClassClassifier } from './class-classifier'
import { COMPOUND_META_KEYS, EMPTY_SET, LAYOUT_OWNED_KEYS } from './constants'
import { DependencyEvaluator } from './dependency-evaluator'
import { defaultDependencyRules } from './dependency-rules'
import { TailwindDiagnostics } from './diagnostics'
import { layoutKeys } from './layout-keys'
import { LayoutState } from './layout-state'

import type {
  AnyRecord,
  ClassPipelineOptions,
  ClassPlugin,
  VariantMap,
  VariantValue,
} from '@praxis-kit/core'
import type { Pipeline, PipelineStage } from '@praxis-kit/pipeline-kit'

import type {
  ClassifiedToken,
  CompoundVariant,
  LayoutKey,
  LayoutProps,
  ResolvedLayout,
  TailwindPipelineArgs,
  TailwindPipelineContext,
  VariantSelection,
} from './types'
declare const process: { env: { NODE_ENV: string } }
const DEV = process.env.NODE_ENV !== 'production'

// Used for the display-prop conflict warning, which fires regardless of strict —
// multiple display props is always a misconfiguration. Does not dedup: every
// render that triggers this warning should be visible.
const devDiagnostics = new Diagnostics(
  new ConsoleReporter(),
  new DefaultPolicy({ reportThreshold: Severity.Warning, throwThreshold: Severity.Fatal }),
)

const classifier = new ClassClassifier()
const evaluator = new DependencyEvaluator(defaultDependencyRules)
const builder = new ClassBuilder()
const VOID_TAG_SET: ReadonlySet<string> = new Set(VOID_TAGS)

function normalizeVariantValue(value: VariantValue): string {
  if (isString(value)) return value
  return value.join(' ')
}

function resolveLayout(
  diagnostics: Diagnostics,
  props: LayoutProps<typeof layoutKeys> & AnyRecord,
): ResolvedLayout<typeof layoutKeys> {
  const active: LayoutKey<typeof layoutKeys>[] = []
  iterate.forEach(layoutKeys, (key) => {
    if (props[key]) active.push(key)
  })
  if (DEV && active.length > 1) {
    diagnostics.warn(TailwindDiagnostics.multipleDisplayProps(active))
  }
  return active[0] ?? 'none'
}

// flex/grid set an element's *inner* display — the formatting context used to lay
// out children. A void element (img, input, br, ...) can never have children, so
// there's nothing for that formatting context to apply to; the mode (and any
// gap-* utility, which only survives filtering when family is 'flex'/'grid') is
// dead weight. Distinct from block/inline/hidden/etc., which set the element's
// *outer* display and stay fully meaningful on a childless element.
function warnLayoutOnVoidTag(diagnostics: Diagnostics, tag: unknown, state: LayoutState): void {
  if (state.family === 'none' || !isString(tag) || !VOID_TAG_SET.has(tag)) return
  diagnostics.warn(TailwindDiagnostics.layoutOnVoidTag(tag, state.mode))
}

function warnReservedLayoutLiterals(diagnostics: Diagnostics, tokens: ClassifiedToken[]): void {
  const reserved: string[] = []
  iterate.forEach(tokens, (token) => {
    if (token.kind === 'layout') reserved.push(token.raw)
  })
  if (reserved.length === 0) return

  diagnostics.warn(TailwindDiagnostics.reservedLayoutLiteral(reserved))
}

function getVariantConfig<V extends VariantMap>(
  options: ClassPipelineOptions<V>,
): VariantMap | undefined {
  return options.variants
}

function getCompoundVariants<V extends VariantMap>(
  options: ClassPipelineOptions<V>,
): readonly CompoundVariant[] {
  return (options.compoundVariants ?? []) as readonly CompoundVariant[]
}

function classifyTokens(className: string): ClassifiedToken[] {
  return className.split(/\s+/).filter(Boolean).map(classifier.classify)
}

function compoundDimensions(compounds: readonly CompoundVariant[]): ReadonlySet<string> {
  if (compounds.length === 0) return EMPTY_SET
  const dims = new Set<string>()
  iterate.forEach(compounds, (compound) => {
    iterate.forEachKey(compound, (key) => {
      if (!COMPOUND_META_KEYS.has(key)) dims.add(key)
    })
  })
  return dims
}

function getDefaultVariants<V extends VariantMap>(
  options: ClassPipelineOptions<V>,
): AnyRecord | undefined {
  return options.defaultVariants as AnyRecord | undefined
}

function resolveActiveSelection<V extends VariantMap>(
  options: ClassPipelineOptions<V>,
  variants: VariantMap,
  props: AnyRecord,
  recipe: string | undefined,
): VariantSelection {
  const preset = recipe ? options.recipeMap?.[recipe] : undefined
  const defaults = getDefaultVariants(options)

  const selection: VariantSelection = {}
  iterate.forEachKey(variants, (dim) => {
    const value = props[dim] ?? preset?.[dim] ?? defaults?.[dim]
    if (value !== undefined && value !== null) selection[dim] = String(value)
  })
  return selection
}

function warnDeadVariants<V extends VariantMap>(
  diagnostics: Diagnostics,
  options: ClassPipelineOptions<V>,
  compoundDims: ReadonlySet<string>,
  props: AnyRecord,
  recipe: string | undefined,
  state: LayoutState,
): void {
  const variants = getVariantConfig(options)
  if (!variants) return

  const selection = resolveActiveSelection(options, variants, props, recipe)
  iterate.forEachEntry(selection, (dim, value) => {
    if (compoundDims.has(dim)) return

    const raw = variants[dim]?.[value]
    if (raw == null) return

    const classStr = normalizeVariantValue(raw)
    const tokens = classifyTokens(classStr)

    if (tokens.length === 0) return

    if (tokens.every((t) => !evaluator.evaluate(t, state))) {
      diagnostics.warn(TailwindDiagnostics.deadVariantClass(dim, value, state.mode, classStr))
    }
  })
}

/**
 * Layout-aware class pipeline for Tailwind CSS utility class strings.
 *
 * This is a `ClassPluginFactory` — the runtime calls it with the component's
 * resolved pipeline options and strict mode. Do NOT call it yourself; pass the
 * function reference as `styling.plugin` and let the runtime invoke it.
 *
 * @example
 * ```ts
 * // CORRECT — pass the reference; the runtime calls it
 * createContractComponent({
 *   tag: 'div',
 *   styling: {
 *     base: 'items-center',
 *     plugin: createTailwindPipeline,
 *   },
 * })
 *
 * // WRONG — calling it manually produces a ClassPlugin where a ClassPluginFactory is expected
 * createContractComponent({
 *   tag: 'div',
 *   styling: {
 *     plugin: createTailwindPipeline({ base: 'items-center' }, false),
 *   },
 * })
 * ```
 *
 * With the plugin active, pass any display prop (`flex`, `inline-flex`, `grid`,
 * `inline-grid`, `block`, `hidden`, etc.) as a boolean to control the display
 * mode. The pipeline injects the display class and strips conflicting utilities:
 * flex-family modes strip `grid-*`; grid-family modes strip `flex-*`; all other
 * display values (and no prop) strip both `flex-*` and `grid-*`.
 */
export function createTailwindPipeline<V extends VariantMap = VariantMap>(
  options: ClassPipelineOptions<V>,
  diagnostics: Diagnostics,
): ClassPlugin<LayoutProps<typeof layoutKeys>> {
  const innerPipeline = createClassPipeline(options)
  const compoundDims = compoundDimensions(getCompoundVariants(options))

  // Steps 1-4 + 6 of the original sequence: resolves layout mode (firing the
  // devDiagnostics conflict warning, unchanged in position), delegates to the
  // styling pipeline, classifies + filters tokens. Everything the later stages
  // need lives on the returned context so neither stage below re-derives it —
  // re-deriving would double-fire devDiagnostics and double-run innerPipeline.
  const resolveLayoutContext: Pipeline<TailwindPipelineArgs, TailwindPipelineContext> = (
    tag,
    props,
    className,
    recipe,
  ) => {
    // devDiagnostics fires regardless of strict — conflict is always a misconfiguration.
    const mode = resolveLayout(devDiagnostics, props)
    const resolvedClasses = innerPipeline(tag, props, className, recipe) ?? ''
    const tokens = classifyTokens(resolvedClasses)
    const state = new LayoutState(mode)
    const filtered = tokens.filter((token) => evaluator.evaluate(token, state))

    // Same devDiagnostics precedent as the conflict warning above — flex/grid
    // being a no-op on a void tag is always a misconfiguration, not something
    // a component's own strict/diagnostics policy should be able to suppress.
    if (DEV) warnLayoutOnVoidTag(devDiagnostics, tag, state)

    return { mode, state, filtered, tokens, props, recipe }
  }

  // Steps 7-8: build the final string from the already-filtered tokens.
  const buildClassString: PipelineStage<TailwindPipelineContext, string> = (ctx) => {
    const built = builder.build(ctx.filtered)
    if (ctx.mode === 'none') return built
    return ctx.filtered.some((t) => t.kind === 'layout' && t.value === ctx.mode)
      ? built
      : cn(ctx.mode, built)
  }

  // Step 5: dev-only diagnostics, run against the same context as buildClassString
  // rather than re-deriving it. A side effect, kept explicit as one rather than
  // forced through allPipelines' result-collecting shape for a value we'd discard.
  const emitDiagnosticsFromContext: PipelineStage<TailwindPipelineContext, void> = (ctx) => {
    if (!DEV) return
    warnReservedLayoutLiterals(diagnostics, ctx.tokens)
    warnDeadVariants(diagnostics, options, compoundDims, ctx.props, ctx.recipe, ctx.state)
  }

  const combined: PipelineStage<TailwindPipelineContext, string> = (ctx) => {
    const built = buildClassString(ctx)
    emitDiagnosticsFromContext(ctx)
    return built
  }

  const mainPipeline = composePipelines(resolveLayoutContext, combined)

  return {
    ownedKeys: LAYOUT_OWNED_KEYS,

    pipeline(tag, props, className, recipe) {
      return mainPipeline(tag, props, className, recipe)
    },
  }
}

/** No-op shim retained for test compatibility. Async state now lives per-pipeline. */
export function _resetPipelineWarns(): void {}
