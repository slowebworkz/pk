/**
 * Compile-time design token collection.
 *
 * Walks factory call ASTs and extracts every statically-declared class string
 * used in `styling.base`, `styling.variants`, `styling.compounds`, and
 * `styling.tags`. Collects them into a per-component manifest and writes a
 * JSON file on `writeBundle`.
 *
 * The primary use case is Tailwind's `safelist` — point the emitted file at
 * Tailwind's content so none of the variant classes are purged:
 *
 *   // tailwind.config.js
 *   export default { content: ['./src/**', './praxis-tokens.json'] }
 *
 * This is a Tailwind v3-style `content`-array mechanism: v4 does not scan
 * `tailwind.config.js` unless the app explicitly adds `@config` to its CSS,
 * which is not the standard v4 setup. On v4, display classes (flex, grid,
 * inline-block, etc.) are not covered by this manifest at all — those are
 * runtime-assembled and require importing `praxis-kit/tailwind.css` instead
 * (see lib/tailwind/src/tailwind-safelist.css).
 *
 * The JSON schema is intentionally stable and human-readable:
 *
 *   {
 *     "components": {
 *       "Button": {
 *         "base": "btn",
 *         "variantClasses": ["btn-sm", "btn-md", "btn-lg"],
 *         "compoundClasses": ["btn-compact"],
 *         "tagClasses": ["link-style"]
 *       }
 *     },
 *     "allClasses": ["btn", "btn-sm", ...]
 *   }
 */
import { iterate } from '@praxis-kit/primitive'
import type { StringMap } from '@praxis-kit/primitive'
import { layoutKeys } from '@praxis-kit/tailwind'
import { writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import ts from 'typescript'
import type { Plugin } from 'vite'
import { asArray, asObject, firstObjectArg, getProperty, isFactoryCall, parseSource } from './ast'
import { ALL_EXTS, DEFAULT_CALLEE_NAMES } from './constants'
import type { PluginOptions } from './types'

// ─── Internal types ───────────────────────────────────────────────────────────

export type ComponentTokens = {
  base: string[]
  variantClasses: string[]
  compoundClasses: string[]
  tagClasses: string[]
}

export type DesignTokenManifest = {
  components: StringMap<ComponentTokens>
  allClasses: string[]
}

// ─── AST extraction helpers ───────────────────────────────────────────────────

/** Recursively appends non-empty string literals from `node` into `out`. Handles string and array literals; ignores other shapes. */
function collectStringValues(node: ts.Node | undefined, out: string[]): void {
  if (!node) return
  if (ts.isStringLiteral(node)) {
    if (node.text.trim()) out.push(node.text)
    return
  }
  if (ts.isArrayLiteralExpression(node)) {
    iterate.forEach(node.elements, (elem) => {
      collectStringValues(elem, out)
    })
  }
}

/** Extracts all statically-declared class strings from a `styling` object's `base`, `variants`, `compounds`, and `tags` fields. */
function extractStylingTokens(stylingObj: ts.ObjectLiteralExpression): ComponentTokens {
  const base: string[] = []
  const variantClasses: string[] = []
  const compoundClasses: string[] = []
  const tagClasses: string[] = []

  // base class
  collectStringValues(getProperty(stylingObj, 'base'), base)

  // variant class values
  const variantsObj = asObject(getProperty(stylingObj, 'variants'))
  if (variantsObj) {
    iterate.forEach(variantsObj.properties, (dimProp) => {
      if (!ts.isPropertyAssignment(dimProp)) return

      const valuesObj = asObject(dimProp.initializer)
      if (!valuesObj) return

      iterate.forEach(valuesObj.properties, (vp) => {
        if (!ts.isPropertyAssignment(vp)) return
        collectStringValues(vp.initializer, variantClasses)
      })
    })
  }

  // compound class values
  const compoundsArr = asArray(getProperty(stylingObj, 'compounds'))
  if (compoundsArr) {
    iterate.forEach(compoundsArr.elements, (elem) => {
      const obj = asObject(elem)
      if (!obj) return
      collectStringValues(getProperty(obj, 'class'), compoundClasses)
    })
  }

  // tag-map class values
  const tagsObj = asObject(getProperty(stylingObj, 'tags'))
  if (tagsObj) {
    iterate.forEach(tagsObj.properties, (tp) => {
      if (!ts.isPropertyAssignment(tp)) return
      collectStringValues(tp.initializer, tagClasses)
    })
  }

  return { base, variantClasses, compoundClasses, tagClasses }
}

// ─── Per-file collection ──────────────────────────────────────────────────────

/**
 * Collects design tokens from all factory calls in a single source file.
 * Each entry in the returned map is keyed by the component variable name.
 *
 * Only `const X = factory(...)` declarations are handled; exported or
 * destructured patterns fall through (same scope as `collectConstraints`).
 */
export function collectFileTokens(
  source: ts.SourceFile,
  calleeNames: ReadonlySet<string>,
): Map<string, ComponentTokens> {
  const result = new Map<string, ComponentTokens>()

  ts.forEachChild(source, (stmt) => {
    if (!ts.isVariableStatement(stmt)) return
    iterate.forEach(stmt.declarationList.declarations, (decl) => {
      const { initializer, name } = decl
      if (!initializer || !ts.isCallExpression(initializer)) return
      if (!isFactoryCall(initializer, calleeNames)) return

      const arg = firstObjectArg(initializer)
      if (!arg) return

      const stylingNode = getProperty(arg, 'styling')
      const stylingObj = asObject(stylingNode)
      if (!stylingObj) return

      const definedName = ts.isIdentifier(name) ? name.text : undefined
      if (!definedName) return

      result.set(definedName, extractStylingTokens(stylingObj))
    })
  })

  return result
}

// ─── Manifest builder ─────────────────────────────────────────────────────────

/** Merges two ComponentTokens with deduplication per class list. Returns `incoming` when `existing` is undefined. */
function mergeTokens(
  existing: ComponentTokens | undefined,
  incoming: ComponentTokens,
): ComponentTokens {
  if (!existing) return incoming
  return {
    base: [...new Set([...existing.base, ...incoming.base])],
    variantClasses: [...new Set([...existing.variantClasses, ...incoming.variantClasses])],
    compoundClasses: [...new Set([...existing.compoundClasses, ...incoming.compoundClasses])],
    tagClasses: [...new Set([...existing.tagClasses, ...incoming.tagClasses])],
  }
}

/**
 * Builds a DesignTokenManifest from the accumulated per-component token maps,
 * including a flat sorted `allClasses` union.
 *
 * `allClasses` always includes every `layoutKeys` display value (`flex`,
 * `inline-flex`, `grid`, `hidden`, etc.) even when no scanned component uses
 * them literally. Those classes are only ever assembled at runtime by
 * `createTailwindPipeline` from boolean props, so they never appear as a
 * string literal for Tailwind's content scanner (or this manifest) to find
 * on its own — without this, Tailwind silently drops their generated CSS.
 */
export function buildManifest(allTokens: Map<string, ComponentTokens>): DesignTokenManifest {
  const components: StringMap<ComponentTokens> = {}
  const seen = new Set<string>(layoutKeys)

  iterate.forEach(allTokens, ([name, tokens]) => {
    components[name] = tokens

    iterate.forEach(
      [...tokens.base, ...tokens.variantClasses, ...tokens.compoundClasses, ...tokens.tagClasses],
      (cls) => {
        iterate.forEach(cls.split(/\s+/), (part) => {
          if (part) seen.add(part)
        })
      },
    )
  })

  return {
    components,
    allClasses: [...seen].sort(),
  }
}

// ─── Vite plugin ──────────────────────────────────────────────────────────────

export type DesignTokensOptions = {
  /**
   * Path where the manifest JSON is written, relative to the Vite project root.
   * @default 'praxis-tokens.json'
   */
  outFile?: string
} & Pick<PluginOptions, 'calleeNames'>

/**
 * Vite plugin that collects every statically-declared class string from
 * `createContractComponent` factory calls and writes a design token manifest
 * to a JSON file on each build.
 *
 * The manifest contains per-component class lists and a flat `allClasses`
 * union that can be used as a Tailwind content source to prevent purging of
 * variant classes.
 *
 * @example
 * // vite.config.ts
 * import { designTokensPlugin } from '@praxis-kit/vite-plugin'
 * export default { plugins: [designTokensPlugin({ outFile: 'praxis-tokens.json' })] }
 *
 * @example
 * // tailwind.config.js
 * export default { content: ['./src/**', './praxis-tokens.json'] }
 */
export function designTokensPlugin(options?: DesignTokensOptions): Plugin {
  const calleeNames = new Set(options?.calleeNames ?? DEFAULT_CALLEE_NAMES)
  const outFile = options?.outFile ?? 'praxis-tokens.json'
  const accumulated = new Map<string, ComponentTokens>()

  return {
    name: 'praxis-kit:design-tokens',

    transform(code, id) {
      const ext = id.split('.').pop() ?? ''
      if (!ALL_EXTS.has(ext)) return null
      const source = parseSource(id, code)
      iterate.forEach(collectFileTokens(source, calleeNames), ([name, tokens]) => {
        accumulated.set(name, mergeTokens(accumulated.get(name), tokens))
      })
      return null
    },

    writeBundle() {
      if (accumulated.size === 0) return
      const manifest = buildManifest(accumulated)
      const root = (this as unknown as { config?: { root?: string } }).config?.root ?? process.cwd()
      writeFileSync(resolve(root, outFile), JSON.stringify(manifest, null, 2))
    },
  }
}
