/**
 * Builder functions for `ContentModel`/`ContentRule`/`ContentConstraint` values — replaces
 * hand-written `{ kind: '...', ... }` object literals and `new Set([...])` calls with names that
 * read like the HTML spec's own vocabulary. Every function here is a pure constructor: no
 * validation, no side effects, just building the literal shape a given `kind` needs.
 */
import type {
  CategorySet,
  ContentCategory,
  ContentConstraint,
  ContentModel,
  ContentModelDefinition,
  ContentRule,
  ContentRuleOf,
  TagKeyedMap,
  TagName,
  TagSet,
} from '../types'

// ─── Sets ───────────────────────────────────────────────────────────────────────────────────────

export function categories(...values: readonly ContentCategory[]): CategorySet {
  return new Set(values)
}

export function tags(...values: readonly TagName[]): TagSet {
  return new Set(values)
}

// ─── Content models ─────────────────────────────────────────────────────────────────────────────

export function category(...allowed: readonly ContentCategory[]): ContentModelDefinition {
  return { model: { kind: 'category', allowed: categories(...allowed) } }
}

export function specific(...allowed: readonly TagName[]): ContentModelDefinition {
  return { model: { kind: 'specific', allowed: tags(...allowed) } }
}

export function transparent(): ContentModelDefinition {
  return { model: { kind: 'transparent' } }
}

export function nothing(): ContentModelDefinition {
  return { model: { kind: 'nothing' } }
}

export function structured(rule: ContentRule): ContentModelDefinition {
  return { model: { kind: 'structured', rule } }
}

// ─── Semantic model helpers ─────────────────────────────────────────────────────────────────────

export function phrasing(): ContentModelDefinition {
  return category('phrasing')
}

export function flow(): ContentModelDefinition {
  return category('flow')
}

export function heading(): ContentModelDefinition {
  return category('heading')
}

export function phrasingOrHeading(): ContentModelDefinition {
  return category('phrasing', 'heading')
}

// ─── Structured content-model rules ────────────────────────────────────────────────────────────

export function tag(name: TagName): ContentRuleOf<'tag'> {
  return { kind: 'tag', tag: name }
}

export function categoryRule(name: ContentCategory): ContentRuleOf<'category'> {
  return { kind: 'category', category: name }
}

export function sequence(...items: readonly ContentRule[]): ContentRuleOf<'sequence'> {
  return { kind: 'sequence', items }
}

export function choice(...items: readonly ContentRule[]): ContentRuleOf<'choice'> {
  return { kind: 'choice', items }
}

export function optional(item: ContentRule): ContentRuleOf<'optional'> {
  return { kind: 'optional', item }
}

export function zeroOrMore(item: ContentRule): ContentRuleOf<'zero-or-more'> {
  return { kind: 'zero-or-more', item }
}

export function oneOrMore(item: ContentRule): ContentRuleOf<'one-or-more'> {
  return { kind: 'one-or-more', item }
}

export function interspersed(
  item: ContentRule,
  ...allowed: readonly TagName[]
): ContentRuleOf<'interspersed'> {
  return { kind: 'interspersed', item, allowed: tags(...allowed) }
}

// ─── Constraints ────────────────────────────────────────────────────────────────────────────────

export function noDescendantCategory(category: ContentCategory): ContentConstraint {
  return { kind: 'no-descendant-category', category }
}

export function noDescendantTag(tagName: TagName): ContentConstraint {
  return { kind: 'no-descendant-tag', tag: tagName }
}

export function noDescendantAttribute(attribute: string): ContentConstraint {
  return { kind: 'no-descendant-attribute', attribute }
}

// ─── Definition helpers ─────────────────────────────────────────────────────────────────────────

/** Builds a `ContentModelDefinition` directly from a `ContentModel` — the escape hatch for a
 *  model that isn't one of the named builders above (e.g. a `structured()` rule combined with
 *  constraints from the start, rather than via `constrained()` after the fact). */
export function defineContentModel(
  model: ContentModel,
  constraints?: readonly ContentConstraint[],
): ContentModelDefinition {
  return constraints?.length ? { model, constraints } : { model }
}

/** Attaches one or more constraints to an already-built `ContentModelDefinition`, e.g.
 *  `constrained(transparent(), noDescendantTag('a'))` for `<a>`'s "no nested anchors" rule.
 *  Appends to (rather than replaces) any constraints the definition already carries. */
export function constrained(
  definition: ContentModelDefinition,
  ...constraints: readonly ContentConstraint[]
): ContentModelDefinition {
  if (!constraints.length) return definition
  return { ...definition, constraints: [...(definition.constraints ?? []), ...constraints] }
}

// ─── Map helpers ────────────────────────────────────────────────────────────────────────────────

/** Builds a `{ tag: categorySet }` slice for `TAG_CATEGORIES`, one category set shared across
 *  every tag in `tagNames` — the common case where a whole group of tags shares identical
 *  category membership (e.g. every plain flow+phrasing inline element). Spread the result into
 *  `TAG_CATEGORIES`'s object literal rather than mutating an already-built map — each tag's
 *  entry is then created exactly once, with no runtime mutation after construction. */
export function categoriesFor(
  categoryList: readonly ContentCategory[],
  tagNames: readonly TagName[],
): TagKeyedMap<CategorySet> {
  return Object.fromEntries(tagNames.map((tagName) => [tagName, categories(...categoryList)]))
}

/**
 * Identity function over a content-model table literal — exists purely so a `HTML_CONTENT_MODELS`
 * table can be authored as a plain object literal (readable, one entry per line) while still
 * getting `const`-context literal inference for each entry's `kind` discriminant, the same
 * benefit an explicit `ContentModelMap` annotation would otherwise cost by widening every
 * property to the annotation's type up front. TypeScript's `const` type parameter modifier
 * (5.0+) does the actual work; this function just gives it a name at the call site.
 */
export function defineContentModels<const T extends Record<string, ContentModelDefinition>>(
  definitions: T,
): T {
  return definitions
}
