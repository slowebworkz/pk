// types/class-extract.ts
import type { StringMap } from '@praxis-kit/primitive'

export type VariantValues = StringMap<string | string[]>
export type VariantMap = StringMap<VariantValues>
export type DefaultMap = StringMap<string>

export type CompoundEntry = {
  conditions: StringMap<string | string[]>
  cls: string | string[]
}

export type StylingConfig = {
  variantMap: VariantMap
  defaults: DefaultMap
  compounds: CompoundEntry[]
}
