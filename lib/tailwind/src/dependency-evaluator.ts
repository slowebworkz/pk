import { assertNever } from '@praxis-kit/core'
import type { DependencyRules } from './dependency-rules'
import type { LayoutState } from './layout-state'
import type { ClassifiedToken } from './types'
import { iterate } from '@praxis-kit/primitive'

export class DependencyEvaluator {
  constructor(private readonly rules: DependencyRules) {}

  evaluate(token: ClassifiedToken, state: LayoutState): boolean {
    switch (token.kind) {
      case 'layout': {
        return token.value === state.mode
      }

      case 'conditional': {
        return token.requires === state.family
      }

      case 'utility': {
        return (
          iterate.find(Object.keys(this.rules) as (keyof DependencyRules)[], (layout) =>
            this.rules[layout].some((rule) => rule.test(token.base))
              ? state.family === layout
              : null,
          ) ?? true
        )
      }

      case 'item': {
        // Item/placement properties resolve against the element's PARENT display
        // mode, which this pipeline can't see — never strip them based on the
        // element's own family. See PRAXIS-KIT-FINDINGS.md #40.
        return true
      }

      case 'gap':
      case 'shared': {
        return state.family !== 'none'
      }

      default:
        throw assertNever(token)
    }
  }
}
