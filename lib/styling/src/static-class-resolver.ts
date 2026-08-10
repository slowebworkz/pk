import { LRUCache } from '@praxis-kit/primitive'
import type { StringMap } from '@praxis-kit/primitive'

export class StaticClassResolver {
  readonly #baseClass: string
  readonly #cache = new LRUCache<string, string>(200)
  readonly #resolveTag: (tag: string) => string

  constructor(baseClass: string | string[], tagMap?: StringMap<string | string[] | undefined>) {
    this.#baseClass = Array.isArray(baseClass) ? baseClass.join(' ') : baseClass

    this.#resolveTag = tagMap
      ? (tag) => {
          const extra = tagMap[tag]
          if (!extra) return this.#baseClass
          const extraStr = Array.isArray(extra) ? extra.join(' ') : extra
          return `${this.#baseClass} ${extraStr}`
        }
      : () => this.#baseClass
  }

  resolve(tag: unknown, skipTagMap = false): string {
    // When a preset (recipe) is active it owns the visual treatment; tag-map overrides
    // would conflict with preset intent, so they are bypassed.
    if (typeof tag !== 'string' || skipTagMap) return this.#baseClass

    const cached = this.#cache.get(tag)
    if (cached !== undefined) return cached

    const result = this.#resolveTag(tag)
    this.#cache.set(tag, result)
    return result
  }
}
