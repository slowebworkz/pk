import type { ComponentContext } from '../../types'
import type { SlotName, VariantMap } from '@praxis-kit/pipeline'
import type { StringMap } from '@praxis-kit/primitive'

export interface CompilerContext extends ComponentContext {
  slots?: readonly SlotName[]
  variants?: VariantMap
  precomputed?: { variantLookup: StringMap<string> }
}
