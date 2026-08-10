import type { AnyRecord, ChildRuleContext, Rule } from '@praxis-kit/core'
import type { StringMap } from '@praxis-kit/primitive'
import type { Diagnostics } from '@praxis-kit/diagnostics'

export type ConformanceFactoryOptions = {
  tag?: string
  name?: string
  styling?: {
    base?: string
    variants?: StringMap<StringMap<string>>
    defaults?: StringMap<string>
    compounds?: ReadonlyArray<StringMap<string> & { class: string }>
    presets?: AnyRecord
  }
  filterProps?: (key: string, variantKeys: ReadonlySet<string>) => boolean
  enforcement?: {
    diagnostics?: Diagnostics
    children?: ReadonlyArray<{
      name: string
      match: (c: unknown) => c is unknown
      cardinality?: Rule<{ min?: number; max?: number }, ChildRuleContext>
    }>
  }
}
