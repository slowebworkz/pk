import type { Simplify } from 'type-fest'
import type { StringMap } from '@praxis-kit/primitive'

/* -------------------------------------------------------------------------- */
/* HTML vocabulary                                                            */
/* -------------------------------------------------------------------------- */

/**
 * HTML content categories per
 * https://html.spec.whatwg.org/multipage/dom.html#kinds-of-content — the vocabulary
 * `CategoryContentModel` and `TAG_CATEGORIES` classify elements against.
 */
export type ContentCategory =
  'embedded' | 'flow' | 'heading' | 'interactive' | 'metadata' | 'phrasing' | 'sectioning'

/**
 * A tag name as the validator actually encounters it at runtime — a JSX-derived string that may
 * be a native HTML element, a custom element, or an unknown/typo'd name. Kept as plain `string`
 * rather than a closed union: the complete native-tag union can be introduced later if compile-time
 * validation of the definition tables themselves (catching a typo'd table key) becomes worth the
 * added type machinery — not needed for the validator to work correctly today, since an unlisted
 * tag already passes through unflagged (see `isAllowed`'s "unknown child tag — don't flag" case).
 */
export type TagName = string

export type CategorySet = ReadonlySet<ContentCategory>
export type TagSet = ReadonlySet<TagName>

/* -------------------------------------------------------------------------- */
/* Simple content models — what the HTML spec says a parent's children may be */
/* -------------------------------------------------------------------------- */

/** A parent's content is any element belonging to one or more content categories (e.g. any
 *  phrasing-content element). */
export interface CategoryContentModel {
  readonly kind: 'category'
  readonly allowed: CategorySet
}

/** A parent's content is an explicit, enumerated set of child tags (e.g. `<tr>` only accepts
 *  `td`/`th`). */
export interface SpecificContentModel {
  readonly kind: 'specific'
  readonly allowed: TagSet
}

/** A parent's content model is "transparent" — it defers to whatever context the parent itself
 *  is rendered in (e.g. `<a>`, `<ins>`, `<del>`, `<map>`). Not yet evaluated by the nesting
 *  validator — see `isAllowed`'s own comment in `no-invalid-html-nesting.ts` — but modeled here
 *  so a future evaluator addition doesn't require another type-system change. */
export interface TransparentContentModel {
  readonly kind: 'transparent'
}

/** A parent's content model is "nothing" per the HTML spec's own term for void/empty elements
 *  (e.g. `<br>`, `<hr>`, `<img>`) — no children are ever valid. */
export interface NothingContentModel {
  readonly kind: 'nothing'
}

/* -------------------------------------------------------------------------- */
/* Structured content models — ordered/repeated child sequences               */
/* -------------------------------------------------------------------------- */

/**
 * One node in a structured content-model grammar (e.g. `<table>`'s real child order:
 * optional `caption`, any number of `colgroup`, optional `thead`, either repeated `tbody` or
 * repeated `tr`, optional `tfoot`). Not yet evaluated by the nesting validator, which currently
 * only checks flat membership (`CategoryContentModel`/`SpecificContentModel`) — modeled here so
 * a genuinely order-aware evaluator can be added later without another type-system change, and
 * so existing "flatten everything into one allowed-tag set" table entries (e.g. today's `table`
 * entry) have a documented, more-precise shape to migrate toward.
 */
export type ContentRule =
  | { readonly kind: 'tag'; readonly tag: TagName }
  | { readonly kind: 'category'; readonly category: ContentCategory }
  | { readonly kind: 'sequence'; readonly items: readonly ContentRule[] }
  | { readonly kind: 'choice'; readonly items: readonly ContentRule[] }
  | { readonly kind: 'optional'; readonly item: ContentRule }
  | { readonly kind: 'zero-or-more'; readonly item: ContentRule }
  | { readonly kind: 'one-or-more'; readonly item: ContentRule }
  | { readonly kind: 'interspersed'; readonly item: ContentRule; readonly allowed: TagSet }

export interface StructuredContentModel {
  readonly kind: 'structured'
  readonly rule: ContentRule
}

/** Extracts the specific `ContentRule` variant for a given `kind`, without duplicating each
 *  branch as its own named interface. */
export type ContentRuleOf<K extends ContentRule['kind']> = Extract<ContentRule, { kind: K }>

/* -------------------------------------------------------------------------- */
/* Content model definition                                                   */
/* -------------------------------------------------------------------------- */

export type ContentModel = Simplify<
  | CategoryContentModel
  | SpecificContentModel
  | TransparentContentModel
  | NothingContentModel
  | StructuredContentModel
>

/* -------------------------------------------------------------------------- */
/* Constraints — rules independent of "what children are allowed"             */
/* -------------------------------------------------------------------------- */

/**
 * A restriction on descendants that isn't itself a content model — e.g. "`<button>` cannot
 * contain interactive descendants" is a constraint on top of button's own (phrasing) content
 * model, not a different content model. Kept separate so `ContentModel` stays a pure answer to
 * "what are this parent's direct children allowed to be," matching how the HTML spec itself
 * separates a content model from additional prose restrictions. Not yet evaluated by the nesting
 * validator, which currently has no descendant-level (as opposed to direct-child) checks at all.
 */
export type ContentConstraint =
  | { readonly kind: 'no-descendant-category'; readonly category: ContentCategory }
  | { readonly kind: 'no-descendant-tag'; readonly tag: TagName }
  | { readonly kind: 'no-descendant-attribute'; readonly attribute: string }

/** An element's full content-model entry: its `ContentModel` plus any constraints beyond direct
 *  child membership. `constraints` is optional since most elements (today, all of them) have
 *  none. */
export interface ContentModelDefinition {
  readonly model: ContentModel
  readonly constraints?: readonly ContentConstraint[]
}

/* -------------------------------------------------------------------------- */
/* Maps                                                                        */
/* -------------------------------------------------------------------------- */

/** Shape of `TAG_CATEGORIES` — per-tag membership in one or more `ContentCategory` groups.
 *  `Partial` is intentional — per that table's own comment, only tags that appear as children of
 *  constrained parents need an entry. */
export type TagCategoryMap = Readonly<Partial<Record<TagName, CategorySet>>>

/** Shape of `HTML_CONTENT_MODELS` — per-tag content-model entry, keyed by tag. Same `Partial`
 *  rationale as `TagCategoryMap`. */
export type ContentModelMap = Readonly<Partial<Record<TagName, ContentModelDefinition>>>

/** Generic shape shared by both maps above, useful when a caller wants to build a partial slice
 *  of one via a helper (`categoriesFor` in `content-model-builders.ts`) without repeating the
 *  `Readonly<Partial<Record<...>>>` wrapper at every call site. */
export type TagKeyedMap<V> = Readonly<Partial<StringMap<V>>>
