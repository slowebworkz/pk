import type { VariantMap } from './variant-map'
import type { VariantSelection } from './variant-selection'
import type { StringMap } from '@praxis-kit/primitive'

/**
 * A static, immutable map of named presets to partial variant selections.
 *
 * Presets are named bundles of variant props that callers activate by key,
 * avoiding the need to repeat variant combinations at each call site.
 */
export type RecipeMap<V extends VariantMap = VariantMap> = Readonly<StringMap<VariantSelection<V>>>
