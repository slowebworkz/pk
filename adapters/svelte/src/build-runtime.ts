import type {
  DefaultOf,
  ElementType,
  PolymorphicGenerics,
  RecipeMap,
  RecipeOf,
  PropsOf,
  VariantMap,
  VariantsOf,
} from '@praxis-kit/core'
import {
  buildCoreRuntime,
  buildEngines,
  composeFilter,
  resolveAdapterCommonOptions,
  SlotValidator,
} from '@praxis-kit/adapter-utils'
import type { SvelteFactoryOptions } from './svelte-options'
import type { BuiltRuntime, WithChildRules } from './types/built-runtime'
import type { NormalizedOptions } from './types/normalized-options'
import type { UnknownProps } from './types'

function normalizeOptions<G extends PolymorphicGenerics>(
  options: SvelteFactoryOptions<DefaultOf<G>, PropsOf<G>, VariantsOf<G>, RecipeOf<G>>,
): NormalizedOptions<G> {
  return { ...options, ...resolveAdapterCommonOptions(options) } as NormalizedOptions<G>
}

export type { BuiltRuntime }

export function buildRuntime<
  TDefault extends ElementType,
  Props extends UnknownProps,
  Variants extends Readonly<VariantMap>,
  TPreset extends RecipeMap<Variants>,
  TOptions extends WithChildRules,
>(
  options: SvelteFactoryOptions<TDefault, Props, Variants, TPreset> & TOptions,
): BuiltRuntime<PolymorphicGenerics<TDefault, Props, Variants, TPreset>, TOptions> {
  type G = PolymorphicGenerics<TDefault, Props, Variants, TPreset>
  const normalized = normalizeOptions<G>(options)
  const { runtime, ownedKeys } = buildCoreRuntime<G>(normalized)
  const { childrenEvaluator } = buildEngines(
    normalized.diagnostics,
    normalized.enforcement?.children,
    normalized.name,
    {
      exclusiveChildren: normalized.enforcement?.exclusiveChildren,
      allowText: normalized.enforcement?.allowText,
    },
  )
  const filterProps = composeFilter(ownedKeys, normalized.filterProps)
  const slotValidator = new SlotValidator(normalized.name, normalized.diagnostics, 'Snippet')

  return {
    runtime,
    filterProps,
    slotValidator,
    ...(childrenEvaluator !== undefined && { childrenEvaluator }),
    ...(options.onElement !== undefined && { onElement: options.onElement }),
  } as BuiltRuntime<G, TOptions>
}
