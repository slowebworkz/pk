import type {
  AnyRecord,
  ElementType,
  PolymorphicGenerics,
  PolymorphicRuntime,
  VariantMap,
  VariantSelection,
} from '@praxis-kit/core'
import type { StringMap } from '@praxis-kit/primitive'

export type Runtime<G extends PolymorphicGenerics> = PolymorphicRuntime<
  G['default'],
  G['props'],
  G['variants'],
  never,
  G['preset']
>

// Erases the slot/preset type parameters so applyToHost can forward a plain
// string recipe without knowing the specific preset key union.
export type LooseRuntime = PolymorphicRuntime<
  ElementType,
  AnyRecord,
  VariantMap,
  string, // TSlot — erased to string
  StringMap<VariantSelection<VariantMap>> // TPreset — erased to loose map
>
