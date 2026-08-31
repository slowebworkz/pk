import type { PolymorphicGenerics } from '@praxis-kit/core'
import type { BuiltChildrenEvaluator, WithChildRules } from '@praxis-kit/adapter-utils'
import type { SlotValidator } from '../slot'
import type { FilterPredicate, NormalizedChild, SlotComponent } from './primitives'
import type { TypedRuntime } from './runtime'

export type BuiltRuntime<
  G extends PolymorphicGenerics,
  TOptions extends WithChildRules = WithChildRules,
> = BuiltChildrenEvaluator<TOptions> & {
  runtime: TypedRuntime<G>
  slotComponent: SlotComponent
  normalizeChildren: (children: unknown) => NormalizedChild[]
  slotValidator: SlotValidator
  filterProps: FilterPredicate
}
