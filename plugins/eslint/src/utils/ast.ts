import type { TSESTree } from '@typescript-eslint/utils'
import { iterate, isObject, isString } from '@praxis-kit/primitive'

type NullableNode = TSESTree.Node | null | undefined

type Property = TSESTree.Property
type ObjectExpression = TSESTree.ObjectExpression
type ArrayExpression = TSESTree.ArrayExpression
type CallExpression = TSESTree.CallExpression

// ---------------------------------------------------------------------------
// Type guards / casts
// ---------------------------------------------------------------------------

/** Narrows any node-shaped value to one whose `value` property is a string — the common check
 *  behind both `asStringLiteral` and `getPropertyKey`'s `Literal` branch. */
function hasStringValue(node: unknown): node is { value: string } {
  return isObject(node, true) && isString(node.value)
}

export function asObjectExpression(node: NullableNode): ObjectExpression | undefined {
  return node?.type === 'ObjectExpression' ? node : undefined
}

export function asArrayExpression(node: NullableNode): ArrayExpression | undefined {
  return node?.type === 'ArrayExpression' ? node : undefined
}

export function asNumericLiteral(node: NullableNode): number | undefined {
  if (node?.type === 'Literal') {
    const { value } = node

    if (typeof value === 'number') {
      return value
    }
  }

  // Negative and positive numeric literals:
  // -1 parses as UnaryExpression("-", Literal(1))
  // +1 parses as UnaryExpression("+", Literal(1))
  if (node?.type === 'UnaryExpression') {
    const { operator, argument } = node

    if (
      (operator === '-' || operator === '+') &&
      argument.type === 'Literal' &&
      typeof argument.value === 'number'
    ) {
      return operator === '-' ? -argument.value : argument.value
    }
  }

  return undefined
}

export function asStringLiteral(node: NullableNode): string | undefined {
  if (node?.type === 'Literal' && hasStringValue(node)) return node.value
  return undefined
}

// ---------------------------------------------------------------------------
// AST helpers
// ---------------------------------------------------------------------------

export function getPropertyKey(prop: Property): string | undefined {
  const { key } = prop
  if (prop.computed) return undefined
  if (key.type === 'Identifier') return key.name
  if (key.type === 'Literal' && hasStringValue(key)) return key.value
  return undefined
}

export function getObjectProperty(obj: ObjectExpression, key: string): Property | undefined {
  return obj.properties.find((prop): prop is Property => {
    if (prop.type !== 'Property' || prop.kind !== 'init') return false
    return getPropertyKey(prop) === key
  })
}

export function getFirstObjectArg(node: CallExpression): ObjectExpression | undefined {
  const [first] = node.arguments

  return first?.type === 'ObjectExpression' ? first : undefined
}

export function isFactoryCall(node: CallExpression, calleeNames: ReadonlySet<string>): boolean {
  const { callee } = node

  if (callee.type === 'Identifier') {
    return calleeNames.has(callee.name)
  }

  if (callee.type === 'MemberExpression' && !callee.computed) {
    const { property } = callee

    return property.type === 'Identifier' && calleeNames.has(property.name)
  }

  return false
}

// ---------------------------------------------------------------------------
// Higher-level extraction
// ---------------------------------------------------------------------------

function extractVariantValues(node: NullableNode): Set<string> | undefined {
  const valuesObj = asObjectExpression(node)
  if (!valuesObj) return undefined

  const values = new Set<string>()
  iterate.forEach(valuesObj.properties, (prop) => {
    if (prop.type !== 'Property') return
    const key = getPropertyKey(prop)
    if (key) values.add(key)
  })
  return values
}

// Builds { variant → Set<allowedValue> } from a styling.variants ObjectExpression. Returns
// undefined only when variantsNode itself isn't a static object literal — individual variant
// entries are extracted independently, so a dynamically-built entry (e.g. `intent:
// getIntentVariants()`) is silently skipped rather than failing the whole extraction. Callers
// that need "fully statically analyzable or nothing" should check the entry count against
// variantsNode's own property count themselves; this function's contract is "return everything
// that can be statically determined."
export function extractVariantMap(
  variantsNode: NullableNode,
): Map<string, Set<string>> | undefined {
  const variantsObj = asObjectExpression(variantsNode)
  if (!variantsObj) return undefined

  const map = new Map<string, Set<string>>()

  iterate.forEach(variantsObj.properties, (prop) => {
    if (prop.type !== 'Property') return

    const key = getPropertyKey(prop)
    if (!key) return

    const values = extractVariantValues(prop.value)
    if (!values) return

    map.set(key, values)
  })

  return map
}
