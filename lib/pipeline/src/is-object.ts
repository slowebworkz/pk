import { isObject as _isObject } from '@praxis-kit/primitive'
import type { StringMap } from '@praxis-kit/primitive'

export function isObject(value: unknown): value is StringMap {
  return _isObject(value, true)
}
