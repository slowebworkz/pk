import type { AnyRecord, FactoryOptions, VariantMap } from '@praxis-kit/core'

/**
 * A maximally widened FactoryOptions shape used as the bridge cast in adapter
 * conformance tests.
 *
 * ConformanceFactoryOptions uses simplified field types (e.g.
 * `defaults?: StringMap<string>`) that don't satisfy FactoryOptions' constrained
 * generics (`Partial<VariantProps<V>>`, `TPreset extends RecipeMap<V>`).
 *
 * Keeping this as a named alias makes the intentional widening explicit rather
 * than coupling the conformance suite to an implementation signature such as
 * `Parameters<typeof createContractComponent>[0]`.
 */
export type BareFactoryOptions = FactoryOptions<string, AnyRecord, Readonly<VariantMap>>
