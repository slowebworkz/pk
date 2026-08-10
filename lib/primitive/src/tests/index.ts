import type { StringMap } from '../types/primitives'

type Attributes = Readonly<StringMap<string>>

const EMPTY_ATTRS: Attributes = Object.freeze({})

const BOOLEAN_ATTRS: ReadonlySet<string> = new Set([
  'disabled',
  'checked',
  'selected',
  'readonly',
  'required',
  'multiple',
  'hidden',
])

function normalizeAttr(key: string, value: string): string {
  switch (key) {
    case 'class':
      return [...new Set(value.trim().split(/\s+/))].sort().join(' ')
    case 'style':
      return value
        .split(';')
        .map((v) => v.trim().replace(/\s*:\s*/, ':'))
        .filter(Boolean)
        .sort()
        .join('; ')
    default:
      return BOOLEAN_ATTRS.has(key) ? '' : value
  }
}

export function parseAttributes(html: string): Attributes {
  const container = document.createElement('div')
  container.innerHTML = html
  const el = container.firstElementChild
  if (!el) return EMPTY_ATTRS
  return Object.freeze(
    Object.fromEntries(
      el.getAttributeNames().map((name) => [name, el.getAttribute(name) ?? ''] as const),
    ),
  )
}

export function parseNormalizedAttributes(html: string): Attributes {
  return normalizeAttributes(parseAttributes(html))
}

export function attributesEqual(a: string, b: string): boolean {
  return (
    JSON.stringify(parseNormalizedAttributes(a)) === JSON.stringify(parseNormalizedAttributes(b))
  )
}

export function normalizeAttributes(attrs: Attributes): Attributes {
  return Object.freeze(
    Object.fromEntries(
      Object.entries(attrs)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, value]) => {
          const normalizedKey = key.toLowerCase()
          return [normalizedKey, normalizeAttr(normalizedKey, value)] as const
        }),
    ),
  )
}
