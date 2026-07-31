import type { SubComponentMap } from '@praxis-kit/primitive'

/**
 * Assembles a compound component by attaching sub-components to a
 * generated root component, producing APIs such as `Card.Header`,
 * `Card.Content`, and `Card.Footer`.
 *
 * Mutates and returns `root` in place, following the convention used by
 * other component post-processing helpers.
 */
export function assembleCompoundComponent<
  TRoot extends object,
  TSubComponents extends SubComponentMap,
>(root: TRoot, subComponents: TSubComponents | undefined): TRoot & TSubComponents {
  if (!subComponents) return root as TRoot & TSubComponents

  return Object.assign(root, subComponents)
}
