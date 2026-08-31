import { assertNever } from '@praxis-kit/core'
import type { ClassifiedToken } from './types/classified-token'
import { iterate } from '@praxis-kit/primitive'

export class ClassBuilder {
  build(tokens: ClassifiedToken[]): string {
    const layout: string[] = []
    const normal: string[] = []

    iterate.forEach(tokens, (token) => {
      switch (token.kind) {
        case 'layout': {
          layout.push(token.raw)
          break
        }

        case 'utility':
        case 'gap':
        case 'item':
        case 'shared':
        case 'conditional': {
          normal.push(token.raw)
          break
        }

        default:
          throw assertNever(token)
      }
    })

    return [...this.#dedupe(layout).toSorted(), ...this.#dedupe(normal)].join(' ')
  }

  #dedupe(arr: string[]): string[] {
    return [...new Set(arr)]
  }
}
