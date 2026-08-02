import type { ChildrenEvaluator, EmptyRecord } from '@praxis-kit/core'
import type { WithChildRules } from '@praxis-kit/primitive'

/**
 * Matches option types that declare child enforcement rules.
 *
 * This type is used to determine whether a
 * {@link ChildrenEvaluator} should be included in a built bundle.
 */
type WithChildrenEnforcement = {
  enforcement: { children: readonly unknown[] }
}

/**
 * The bundle of child evaluation services produced when
 * child enforcement rules are configured.
 */
type ChildrenEvaluatorBundle = { childrenEvaluator: ChildrenEvaluator }

/**
 * Conditionally includes a {@link ChildrenEvaluator} in the
 * built bundle when child enforcement rules are present.
 *
 * When no child enforcement rules are configured, this type
 * resolves to {@link EmptyRecord}, omitting the property
 * entirely rather than making it optional. Consumers can
 * safely narrow using:
 *
 * ```ts
 * if ('childrenEvaluator' in bundle) {
 *   // bundle.childrenEvaluator is available
 * }
 * ```
 *
 * @typeParam TOptions - The component configuration options.
 */
export type BuiltChildrenEvaluator<TOptions extends WithChildRules> =
  TOptions extends WithChildrenEnforcement ? ChildrenEvaluatorBundle : EmptyRecord
