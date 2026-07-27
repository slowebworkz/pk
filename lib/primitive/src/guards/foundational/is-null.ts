import { isUndefined } from './is-defined'

export function isNull(value: unknown): value is null {
  return value === null
}

export function isNonNull<T>(value: T): value is NonNullable<T> {
  return value != null
}

export function isNullish(value: unknown): value is null | undefined {
  return isNull(value) || isUndefined(value)
}
