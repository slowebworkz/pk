import type { FactoryOptions } from '@praxis-kit/core'
import { deriveSubComponentRules } from '@praxis-kit/contract'

/**
 * Resolves a component's `subComponents` declaration into the runtime
 * options the factory actually builds from — merging the derived child
 * contract with any rules the consumer already declared, so the compound
 * API and its child contract stay synchronized.
 *
 * Returns `options` unchanged when `subComponents` is absent.
 */
export function resolveSubComponentOptions<O extends FactoryOptions>(options: O): O {
  if (!options.subComponents) return options

  return {
    ...options,
    enforcement: {
      ...options.enforcement,
      children: [
        ...(options.enforcement?.children ?? []),
        ...deriveSubComponentRules(options.subComponents),
      ],
    },
  }
}
