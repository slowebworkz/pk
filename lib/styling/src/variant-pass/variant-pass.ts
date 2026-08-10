import type { StyleContext } from './types'
import { iterate } from '@praxis-kit/primitive'
import type { AnyRecord, StringMap } from '@praxis-kit/primitive'

/** Flat compound variant: all keys except `class` are condition key:value pairs. */
export type CompoundVariant = { readonly class: string | readonly string[] } & StringMap<
  string | readonly string[]
>

export interface VariantConfig {
  variants: StringMap<StringMap<string>>
  presets?: StringMap<StringMap<string>>
  defaults?: StringMap<string>
  compounds?: ReadonlyArray<CompoundVariant>
}

export interface VariantPass {
  name: string
  execute(context: Readonly<StyleContext>): { context: { classes: string[] } }
}

export function createVariantPass(activeProps: AnyRecord, config: VariantConfig): VariantPass {
  return {
    name: 'variant',
    execute() {
      const preset = typeof activeProps['preset'] === 'string' ? activeProps['preset'] : undefined
      const presetDefaults =
        preset !== undefined && config.presets?.[preset] !== undefined ? config.presets[preset] : {}
      // Merge order: factory defaults < preset values < explicitly set props
      const resolved: AnyRecord = {
        ...config.defaults,
        ...presetDefaults,
        ...activeProps,
      }

      const classes: string[] = []
      iterate.forEachEntry(config.variants, (key, valueMap) => {
        const active = resolved[key]
        if (typeof active === 'string') {
          const cls = valueMap[active]
          if (cls !== undefined) classes.push(cls)
        }
      })

      return { context: { classes } }
    },
  }
}
