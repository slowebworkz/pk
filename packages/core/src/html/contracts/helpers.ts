import type {
  ChildContract,
  ChildMatcher,
  ChildRuleInput,
  EnforcementOptions,
  HtmlTag,
  VNodeLike,
} from './types'
import { getTag, isObject, isTag } from '@praxis-kit/primitive'
import { warnDiagnostics } from '@praxis-kit/diagnostics'
import { METADATA_TAGS } from './categories'

/** Narrows an unknown value to the minimal vnode shape used by contract helpers. */
function isVNodeLike(child: unknown): child is VNodeLike {
  return isObject(child) && 'type' in child
}

/**
 * Creates a matcher that accepts any element except the supplied HTML tags.
 *
 * Tag resolution is semantic-aware, so Praxis components are matched by their
 * resolved HTML tag rather than their component type.
 */
export function isOpenContent(...blockedTags: HtmlTag[]): ChildMatcher {
  const set = new Set(blockedTags)
  return (child: unknown): child is VNodeLike => {
    if (!isVNodeLike(child)) return false
    const tag = getTag(child)
    return tag === undefined || !set.has(tag)
  }
}

const metadataMatch = isTag(...METADATA_TAGS)

/** Creates a child rule matching HTML metadata content (`<script>` and `<template>`). */
export function metadata(name = 'metadata'): ChildRuleInput {
  return { name, match: metadataMatch }
}

/**
 * Creates an optional singleton child rule (`max: 1`).
 *
 * Used as the building block for positional variants such as `firstOptional()`.
 */
export function optional(name: string, tag: HtmlTag): ChildRuleInput {
  return { name, match: isTag(tag), cardinality: { max: 1 } }
}

export function firstOptional(name: string, tag: HtmlTag): ChildRuleInput {
  return { ...optional(name, tag), position: 'first' }
}

/**
 * Creates an enforcement contract with the default diagnostics configuration.
 */
export function contract(
  children: ChildContract,
  options?: Pick<EnforcementOptions, 'exclusiveChildren' | 'allowText'>,
): EnforcementOptions {
  return { diagnostics: warnDiagnostics, children, ...options }
}

/**
 * Creates a closed content model.
 *
 * Only the supplied child rules are permitted; all other children are rejected.
 */
export function closedContract(children: ChildContract): EnforcementOptions {
  return contract(children, { exclusiveChildren: true })
}

/** Creates an ARIA-only enforcement contract. */
export function ariaContract(aria: NonNullable<EnforcementOptions['aria']>): EnforcementOptions {
  return { diagnostics: warnDiagnostics, aria }
}

/**
 * Creates a contract with an optional leading child followed by open content.
 *
 * Used by elements such as `<details>` and `<fieldset>` whose first child has
 * special semantics.
 */
export function firstChildContract(name: string, tag: HtmlTag): EnforcementOptions {
  return contract([firstOptional(name, tag), { name: 'content', match: isOpenContent(tag) }])
}

/**
 * Returns a property from a vnode-like child, if present.
 */
export function getChildProp(child: unknown, key: PropertyKey): unknown {
  if (!isVNodeLike(child)) return undefined
  const { props } = child
  if (!isObject(props)) return undefined
  return Reflect.get(props, key)
}
