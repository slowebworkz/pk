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

export type LooseRuntime = PolymorphicRuntime<
  ElementType,
  AnyRecord,
  VariantMap,
  string,
  StringMap<VariantSelection<VariantMap>>
>
