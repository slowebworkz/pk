import type { RecipeTarget, VariantMap } from '../variants'
import type { StringMap } from '../primitives'

export interface RecipeOptions<TVariants extends VariantMap = VariantMap> {
  recipeMap?: StringMap<RecipeTarget<TVariants>>
}
