import type { PolymorphicGenerics } from '@praxis-kit/core'
import type { Simplify } from 'type-fest'
import type { WithChildRules } from '@praxis-kit/primitive'
import type { BuiltChildrenEvaluator } from './built-children-evaluator'
import type { FilterPredicate } from './filter-predicate'
import type { SlotValidator } from '../slot/slot-validator'
import type { TypedRuntime } from './typed-runtime'

/**
 * The fields present in every built runtime, regardless of whether child
 * enforcement is configured.
 *
 * @typeParam G - The polymorphic generics describing the component.
 */
type BaseBuiltRuntimeFields<G extends PolymorphicGenerics> = {
  runtime: TypedRuntime<G>
  filterProps: FilterPredicate
  slotValidator: SlotValidator
}

/**
 * Runtime features that depend on the component's configuration, as opposed
 * to the fixed services present in every runtime.
 *
 * @typeParam TOptions - The component configuration options.
 */
type RuntimeCapabilities<TOptions extends WithChildRules> = BuiltChildrenEvaluator<TOptions>

/**
 * The common runtime contract shared by all framework adapters.
 *
 * Includes the core runtime services required by every adapter and
 * conditionally adds a {@link ChildrenEvaluator} when child enforcement
 * rules are configured.
 *
 * Framework-specific adapters extend this type with additional runtime
 * services (for example, `slotComponent` or `normalizeChildren`).
 *
 * Wrapped in {@link Simplify} so IDEs display a flattened object type rather
 * than an intersection of helper types.
 *
 * @typeParam G - The polymorphic generics describing the component.
 * @typeParam TOptions - The component configuration options.
 */
export type BaseBuiltRuntime<
  G extends PolymorphicGenerics,
  TOptions extends WithChildRules = WithChildRules,
> = Simplify<RuntimeCapabilities<TOptions> & BaseBuiltRuntimeFields<G>>
