import type { NodeDecoration } from '@praxis-kit/runtime'
import type { NodeId } from '@praxis-kit/pipeline'
import type { CompoundRecord, Defaults, PresetRecord, VariantRecord } from './build-variant-config'
import { buildVariantConfig } from './build-variant-config'
import type { ClassResolution } from './resolve-classes'
import { resolveClasses } from './resolve-classes'
import type { StringMap } from '@praxis-kit/primitive'

export interface StylePipeline {
  execute(decoration: Record<NodeId, NodeDecoration>, recipe?: string): ClassResolution
}

export function buildStylePipeline(
  variants: VariantRecord | undefined,
  presets: PresetRecord | undefined,
  defaults: Defaults,
  compounds: ReadonlyArray<CompoundRecord> | undefined,
  variantLookup: StringMap<string> | undefined,
): StylePipeline | undefined {
  if (
    variants === undefined &&
    compounds === undefined &&
    presets === undefined &&
    variantLookup === undefined
  ) {
    return undefined
  }

  const variantConfig = buildVariantConfig(variants, presets, defaults, compounds)

  return {
    execute(decoration, recipe) {
      return resolveClasses(decoration, variantConfig, defaults, recipe, compounds, variantLookup)
    },
  }
}
