import type { AnyRecord, ElementType } from '@praxis-kit/core'
import { enforceAllowedAs } from '@praxis-kit/core'
import { iterate } from '@praxis-kit/primitive'

import { applyFilter, resolveNormalizedProps } from '../props'

import type { Diagnostics } from '@praxis-kit/diagnostics'
import type { FilterPredicate } from '../types'

// Minimal structural shape the SSR renderer needs — matches every non-VDOM adapter's
// LooseRuntime (Lit, Web) without requiring them to import a shared generic type.
export type SsrRuntime = {
  resolveTag(as?: ElementType): ElementType
  resolveProps(props: AnyRecord): AnyRecord
  resolveClasses(
    tag: ElementType,
    props: AnyRecord,
    className?: string,
    recipe?: string,
  ): string | undefined
  resolveAria<P extends AnyRecord>(tag: ElementType, props: P): { props: P }
  options: {
    readonly allowedAs?: readonly ElementType[]
    readonly diagnostics?: Diagnostics
    readonly displayName?: string
    readonly variantKeys: ReadonlySet<string>
    readonly normalizeFn?: (props: AnyRecord) => AnyRecord
    readonly htmlPropNormalizersFn?: (
      tag: ElementType,
    ) => readonly ((props: AnyRecord) => AnyRecord)[] | undefined
  }
}

export type SsrBundle = {
  readonly runtime: SsrRuntime
  readonly filterProps: FilterPredicate
}

function escapeAttr(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;')
}

function buildAttrString(attributes: AnyRecord): string {
  const parts: string[] = []
  iterate.forEachEntry(attributes, (key, value) => {
    if (value === false || value === null || value === undefined) return
    if (value === true) {
      parts.push(key)
    } else {
      parts.push(`${key}="${escapeAttr(String(value))}"`)
    }
  })
  return parts.length > 0 ? ` ${parts.join(' ')}` : ''
}

/**
 * Renders a praxis-kit non-VDOM component (Lit, Web) to an HTML string without
 * requiring a DOM. Tag polymorphism works correctly in SSR — `options.tag` and the
 * `as` prop are resolved directly to the HTML element tag.
 *
 * `innerHTML` is assumed to be trusted, already-escaped HTML and is inserted
 * verbatim — it is not escaped here. Callers are responsible for escaping any
 * untrusted content before passing it.
 */
export function renderBundleToString(
  bundle: SsrBundle,
  props: AnyRecord = {},
  innerHTML = '',
): string {
  const {
    filterProps,
    runtime: { options, resolveAria, resolveClasses, resolveProps, resolveTag },
  } = bundle
  const { as, className, recipe, class: classAttr, ...rest } = props

  const tag = resolveTag(as as ElementType | undefined)
  if (options.allowedAs !== undefined) {
    enforceAllowedAs(tag, options.allowedAs, options.diagnostics, options.displayName)
  }
  const mergedProps = resolveProps(rest)
  const finalProps = resolveNormalizedProps(options, tag, mergedProps)

  const resolvedClass = resolveClasses(
    tag,
    finalProps,
    // Accept both React-style className and HTML-native class
    (className as string | undefined) ?? (classAttr as string | undefined),
    recipe as string | undefined,
  )

  const ariaResult = resolveAria(tag, finalProps)
  const filtered = applyFilter(ariaResult.props, filterProps, options.variantKeys)

  // Runtime-generated class always wins over any pipeline-filtered `class` prop.
  const attrs: AnyRecord = { ...filtered, class: resolvedClass || undefined }
  const attrStr = buildAttrString(attrs)

  return `<${tag}${attrStr}>${innerHTML}</${tag}>`
}
