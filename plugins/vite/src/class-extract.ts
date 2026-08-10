/**
 * Compile-time variant class precomputation.
 *
 * Extracts `styling.variants`, `styling.defaults`, and `styling.compounds` from
 * factory call ASTs, enumerates all statically-known prop combinations, computes
 * the variant class string for each, and injects the resulting map as
 * `styling.precomputedClasses` directly into the source.
 *
 * At runtime, `VariantClassResolver` checks `precomputedClasses` before
 * calling CVA — a plain object lookup replaces a CVA invocation + LRU cache
 * write for every covered combination.
 *
 * **Skipped when any of the following are true:**
 * - `styling.variants` is absent or contains non-literal values
 * - `styling.compounds` contains non-literal conditions or class values
 * - The total number of combinations exceeds MAX_COMBINATIONS
 * - The styling object already has a `precomputedClasses` property
 *
 * @example
 * Before:
 * ```ts
 * styling: {
 *   variants: { size: { sm: 'text-sm', lg: 'text-lg' } },
 * }
 * ```
 * After:
 * ```ts
 * styling: {
 *   variants: { size: { sm: 'text-sm', lg: 'text-lg' } },
 *   precomputedClasses: {
 *     '__none__:': '',
 *     '__none__:size:s:sm': 'text-sm',
 *     '__none__:size:s:lg': 'text-lg',
 *   },
 * }
 * ```
 */
import ts from 'typescript'
import { asArray, asObject, firstObjectArg, getProperty, isFactoryCall, walk } from './ast'
import { iterate } from '@praxis-kit/primitive'
import type { StringMap } from '@praxis-kit/primitive'
import type { CompoundEntry, DefaultMap, StylingConfig, VariantMap } from './types'

// Cap to keep injected code size reasonable.
const MAX_COMBINATIONS = 512

// ─── AST extraction ───────────────────────────────────────────────────────────

/** Returns the text of a string literal node, or undefined. */
function asString(node: ts.Node | undefined): string | undefined {
  return node && ts.isStringLiteral(node) ? node.text : undefined
}

/**
 * Returns the text of a string literal, the texts of all elements of an array literal
 * (every element must be a string literal), or undefined for any other shape.
 */
function asStringOrStringArray(node: ts.Node | undefined): string | string[] | undefined {
  if (!node) return undefined
  if (ts.isStringLiteral(node)) return node.text
  if (ts.isArrayLiteralExpression(node)) {
    const items: string[] = []
    const allStrings = iterate.every(node.elements, (elem) => {
      if (!ts.isStringLiteral(elem)) return false
      items.push(elem.text)
      return true
    })
    if (!allStrings) return undefined
    return items
  }
  return undefined
}

/** Returns the name text of a property assignment with an identifier or string literal key, or undefined. */
function propKey(prop: ts.ObjectLiteralElementLike): string | undefined {
  if (!ts.isPropertyAssignment(prop)) return undefined
  const n = prop.name
  return ts.isIdentifier(n) || ts.isStringLiteral(n) ? n.text : undefined
}

/**
 * Extracts `styling.variants` into a nested `VariantMap`.
 * Returns null when any variant key or value entry is non-literal (bail — can't enumerate).
 */
function extractVariantMap(stylingObj: ts.ObjectLiteralExpression): VariantMap | null {
  const variantsObj = asObject(getProperty(stylingObj, 'variants'))
  if (!variantsObj) return null

  return iterate.collect(variantsObj.properties, (prop) => {
    const key = propKey(prop)
    if (!key || !ts.isPropertyAssignment(prop)) return null

    const valuesObj = asObject(prop.initializer)
    if (!valuesObj) return null

    const values = iterate.collect(valuesObj.properties, (vp) => {
      const vk = propKey(vp)
      if (!vk || !ts.isPropertyAssignment(vp)) return null

      const value = asStringOrStringArray(vp.initializer)
      if (value === undefined) return null

      return [vk, value] as const
    })

    if (!values) return null

    return [key, values] as const
  })
}

/** Extracts `styling.defaults` as a `Record<variantKey, defaultValue>`. Returns `{}` when absent or non-literal. */
function extractDefaults(stylingObj: ts.ObjectLiteralExpression): DefaultMap {
  const defaultsObj = asObject(getProperty(stylingObj, 'defaults'))
  if (!defaultsObj) return {}
  return (
    iterate.collect(defaultsObj.properties, (prop) => {
      const key = propKey(prop)
      if (!key || !ts.isPropertyAssignment(prop)) return null

      const value = asString(prop.initializer)
      if (value === undefined) return null

      return [key, value] as const
    }) ?? {}
  )
}

/**
 * Extracts `styling.compounds` as a typed array.
 * Returns null when any entry has a non-literal condition value or class — signals bail to the caller.
 */
function extractCompounds(stylingObj: ts.ObjectLiteralExpression): CompoundEntry[] | null {
  const compoundsArr = asArray(getProperty(stylingObj, 'compounds'))
  if (!compoundsArr) return []

  const result: CompoundEntry[] = []
  const resultReturned = iterate.every(compoundsArr.elements, (elem) => {
    const obj = asObject(elem)
    if (!obj) return false

    const cls = asStringOrStringArray(getProperty(obj, 'class'))
    if (cls === undefined) return false

    const conditions: StringMap<string | string[]> = {}
    const keyOrVNotDefined = iterate.every(obj.properties, (cp) => {
      const key = propKey(cp)
      if (!key || !ts.isPropertyAssignment(cp)) return false
      if (key === 'class') return true

      const v = asStringOrStringArray(cp.initializer)
      if (v === undefined) return false

      conditions[key] = v
      return true
    })
    if (!keyOrVNotDefined) return false

    result.push({ conditions, cls })

    return true
  })
  return resultReturned ? result : null
}

// ─── Combination enumeration ──────────────────────────────────────────────────

/**
 * Enumerates every subset of variant props (each dimension either absent or set
 * to one of its declared values). Returns null if total would exceed MAX_COMBINATIONS.
 */
export function enumerateCombinations(variantMap: VariantMap): Array<StringMap<string>> | null {
  const keys = Object.keys(variantMap)
  if (keys.length === 0) return [{}]

  let total = 1
  const totalUnderMaxLimit = iterate.every(keys, (key) => {
    total *= Object.keys(variantMap[key]!).length + 1
    return total <= MAX_COMBINATIONS
  })
  if (!totalUnderMaxLimit) return null

  function enumerateRecursive(remaining: string[]): Array<StringMap<string>> {
    if (remaining.length === 0) return [{}]
    const first = remaining[0] as string
    const rest = remaining.slice(1)
    const restCombos = enumerateRecursive(rest)
    const valueKeys = Object.keys(variantMap[first]!)
    const out: Array<StringMap<string>> = []
    iterate.forEach(restCombos, (combo) => {
      out.push(combo)
      iterate.forEach(valueKeys, (v) => {
        out.push({ [first]: v, ...combo })
      })
    })
    return out
  }

  return enumerateRecursive(keys)
}

// ─── Cache key ────────────────────────────────────────────────────────────────

/**
 * Builds the VariantClassResolver cache key for a given explicit prop combination.
 * Absent variant dimensions are excluded from the key (defaults apply in compute).
 */
export function buildCacheKey(props: StringMap<string>): string {
  const parts = Object.keys(props)
    .sort()
    .map((k) => `${k}:s:${props[k]}`)
  return `__none__:${parts.join('|')}`
}

// ─── Class computation ────────────────────────────────────────────────────────

/** Computes the final class string for a given explicit prop combination against a resolved styling config. */
function computeClasses(config: StylingConfig, props: StringMap<string>): string {
  const { variantMap, defaults, compounds } = config
  const effective = { ...defaults, ...props }
  const classes: string[] = []
  iterate.forEachEntry(variantMap, (key, values) => {
    const v = effective[key]
    if (v === undefined) return
    const cls = values[v]
    if (cls === undefined) return
    if (Array.isArray(cls)) classes.push(...cls)
    else classes.push(cls)
  })

  iterate.forEach(compounds, ({ conditions, cls }) => {
    const ok = iterate.every(iterate.entries(conditions), ([key, cond]) => {
      const value = effective[key]

      return Array.isArray(cond) ? value !== undefined && cond.includes(value) : value === cond
    })

    if (ok) {
      if (Array.isArray(cls)) classes.push(...cls)
      else classes.push(cls)
    }
  })

  return classes.filter(Boolean).join(' ')
}

// ─── Map builder ──────────────────────────────────────────────────────────────

/**
 * Builds a precomputed class map for the given styling object literal.
 *
 * Returns null when static extraction is not possible (non-literal values,
 * no variants, or combination count exceeds MAX_COMBINATIONS).
 */
export function buildPrecomputedClasses(
  stylingObj: ts.ObjectLiteralExpression,
): StringMap<string> | null {
  if (getProperty(stylingObj, 'precomputedClasses') !== undefined) return null

  const variantMap = extractVariantMap(stylingObj)
  if (!variantMap || Object.keys(variantMap).length === 0) return null

  const defaults = extractDefaults(stylingObj)
  const compounds = extractCompounds(stylingObj)
  if (!compounds) return null

  const combos = enumerateCombinations(variantMap)
  if (!combos) return null

  const config: StylingConfig = { variantMap, defaults, compounds }
  return iterate.collect(
    combos,
    (combo) => [buildCacheKey(combo), computeClasses(config, combo)] as const,
  )
}

// ─── AST transformer ─────────────────────────────────────────────────────────

/** Returns a TS transformer that injects a `precomputedClasses` property into each eligible factory call's `styling` object. */
function createClassExtractTransformer(
  factory: ts.NodeFactory,
  calleeNames: ReadonlySet<string>,
  onInjected: () => void,
): ts.TransformerFactory<ts.SourceFile> {
  return (context) => {
    function visit(node: ts.Node): ts.Node {
      if (!ts.isCallExpression(node)) return ts.visitEachChild(node, visit, context)
      if (!isFactoryCall(node, calleeNames)) return ts.visitEachChild(node, visit, context)

      const arg = firstObjectArg(node)
      if (!arg) return node

      const stylingNode = getProperty(arg, 'styling')
      const stylingObj = asObject(stylingNode)
      if (!stylingObj) return ts.visitEachChild(node, visit, context)

      const map = buildPrecomputedClasses(stylingObj)
      if (!map) return ts.visitEachChild(node, visit, context)

      onInjected()

      // Build `precomputedClasses: { 'key': 'value', ... }` property.
      const mapProps = Array.from(
        iterate.map(iterate.entries(map), ([key, value]) =>
          factory.createPropertyAssignment(
            factory.createStringLiteral(key),
            factory.createStringLiteral(value),
          ),
        ),
      )
      const mapLiteral = factory.createObjectLiteralExpression(mapProps, true)
      const precomputedProp = factory.createPropertyAssignment(
        factory.createIdentifier('precomputedClasses'),
        mapLiteral,
      )

      const newStylingObj = factory.createObjectLiteralExpression(
        [...stylingObj.properties, precomputedProp],
        true,
      )
      const newArgProps = arg.properties.map((p) => {
        if (
          ts.isPropertyAssignment(p) &&
          (ts.isIdentifier(p.name) || ts.isStringLiteral(p.name)) &&
          p.name.text === 'styling'
        ) {
          return factory.createPropertyAssignment(p.name, newStylingObj)
        }
        return p
      })
      const newArg = factory.createObjectLiteralExpression(newArgProps, true)
      return factory.createCallExpression(node.expression, node.typeArguments, [
        newArg,
        ...node.arguments.slice(1),
      ])
    }

    return (sourceFile) => ts.visitEachChild(sourceFile, visit, context)
  }
}

// ─── Public entry point ───────────────────────────────────────────────────────

/**
 * Injects precomputed variant class maps into all factory calls in the given
 * source file that have fully-static `styling.variants` configurations.
 *
 * Returns null when no factory calls with injectable variants are found.
 */
export function injectPrecomputedClasses(
  source: ts.SourceFile,
  calleeNames: ReadonlySet<string>,
): string | null {
  const hasVariants = iterate.some(
    walk(source),
    (node) =>
      ts.isPropertyAssignment(node) &&
      (ts.isIdentifier(node.name) || ts.isStringLiteral(node.name)) &&
      node.name.text === 'variants',
  )
  if (!hasVariants) return null

  let didInject = false
  const result = ts.transform(
    source,
    [
      createClassExtractTransformer(ts.factory, calleeNames, () => {
        didInject = true
      }),
    ],
    { target: ts.ScriptTarget.Latest },
  )

  if (!didInject) {
    result.dispose()
    return null
  }

  const printer = ts.createPrinter({ newLine: ts.NewLineKind.LineFeed, removeComments: false })
  const output = printer.printFile(result.transformed[0]!)
  result.dispose()
  return output
}
