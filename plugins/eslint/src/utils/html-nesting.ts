import type { CategorySet, ContentModelDefinition, ContentModelMap, TagCategoryMap } from '../types'
import {
  categoriesFor,
  defineContentModels,
  phrasing,
  phrasingOrHeading,
  specific,
} from './content-model-builders'

/* -------------------------------------------------------------------------- */
/* Tag groups — each array lists every tag sharing one exact category set,    */
/* so TAG_CATEGORIES below can build each entry once via categoriesFor, with  */
/* no runtime mutation after construction.                                    */
/* -------------------------------------------------------------------------- */

const FLOW_PHRASING_TAGS = [
  'abbr',
  'b',
  'bdi',
  'bdo',
  'br',
  'cite',
  'code',
  'data',
  'dfn',
  'em',
  'i',
  'kbd',
  'mark',
  'output',
  'q',
  'ruby',
  's',
  'samp',
  'small',
  'span',
  'strong',
  'sub',
  'sup',
  'time',
  'u',
  'var',
  'wbr',
] as const

const FLOW_PHRASING_EMBEDDED_TAGS = [
  'audio',
  'canvas',
  'img',
  'math',
  'object',
  'picture',
  'svg',
  'video',
] as const

const FLOW_PHRASING_INTERACTIVE_TAGS = ['button', 'input', 'label', 'select', 'textarea'] as const

const FLOW_PHRASING_EMBEDDED_INTERACTIVE_TAGS = ['embed', 'iframe'] as const

const FLOW_PHRASING_METADATA_TAGS = ['meta', 'noscript', 'script', 'template', 'link'] as const

const FLOW_ONLY_TAGS = [
  'address',
  'blockquote',
  'dialog',
  'div',
  'dl',
  'fieldset',
  'figure',
  'footer',
  'form',
  'header',
  'hr',
  'li',
  'main',
  'menu',
  'ol',
  'p',
  'pre',
  'summary',
  'table',
  'ul',
] as const

const FLOW_SECTIONING_TAGS = ['article', 'aside', 'nav', 'section'] as const

const FLOW_INTERACTIVE_TAGS = ['details'] as const

const FLOW_METADATA_TAGS = ['style'] as const

const FLOW_HEADING_TAGS = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'hgroup'] as const

const METADATA_ONLY_TAGS = ['base', 'title'] as const

/* -------------------------------------------------------------------------- */
/* Category membership                                                        */
/* -------------------------------------------------------------------------- */

// Per-tag category membership. Only tags that appear as children of constrained parents
// need to be listed — unconstrained parents (div, section, …) accept any flow content.
export const TAG_CATEGORIES: TagCategoryMap = {
  ...categoriesFor(['flow', 'phrasing'], FLOW_PHRASING_TAGS),
  ...categoriesFor(['flow', 'phrasing', 'embedded'], FLOW_PHRASING_EMBEDDED_TAGS),
  ...categoriesFor(['flow', 'phrasing', 'interactive'], FLOW_PHRASING_INTERACTIVE_TAGS),
  ...categoriesFor(
    ['flow', 'phrasing', 'embedded', 'interactive'],
    FLOW_PHRASING_EMBEDDED_INTERACTIVE_TAGS,
  ),
  ...categoriesFor(['metadata', 'flow', 'phrasing'], FLOW_PHRASING_METADATA_TAGS),
  ...categoriesFor(['flow'], FLOW_ONLY_TAGS),
  ...categoriesFor(['flow', 'sectioning'], FLOW_SECTIONING_TAGS),
  ...categoriesFor(['flow', 'interactive'], FLOW_INTERACTIVE_TAGS),
  ...categoriesFor(['flow', 'metadata'], FLOW_METADATA_TAGS),
  ...categoriesFor(['flow', 'heading'], FLOW_HEADING_TAGS),
  ...categoriesFor(['metadata'], METADATA_ONLY_TAGS),
}

/* -------------------------------------------------------------------------- */
/* Content models                                                             */
/* -------------------------------------------------------------------------- */

export const HTML_CONTENT_MODELS: ContentModelMap = defineContentModels({
  // Specific-tag constraints (structural elements whose content is enumerated, not categorical)
  colgroup: specific('col', 'template'),
  dl: specific('dt', 'dd', 'div', 'script', 'template'),
  menu: specific('li', 'script', 'template'),
  ol: specific('li', 'script', 'template'),
  optgroup: specific('option', 'script', 'template'),
  picture: specific('source', 'img', 'script', 'template'),
  select: specific('option', 'optgroup', 'hr', 'script', 'template'),
  table: specific('caption', 'colgroup', 'thead', 'tbody', 'tfoot', 'tr', 'script', 'template'),
  tbody: specific('tr', 'script', 'template'),
  tfoot: specific('tr', 'script', 'template'),
  thead: specific('tr', 'script', 'template'),
  tr: specific('td', 'th', 'script', 'template'),
  ul: specific('li', 'script', 'template'),

  // Phrasing-content parents (any element whose content model is phrasing content)
  abbr: phrasing(),
  b: phrasing(),
  bdi: phrasing(),
  bdo: phrasing(),
  cite: phrasing(),
  code: phrasing(),
  data: phrasing(),
  dfn: phrasing(),
  dt: phrasing(),
  em: phrasing(),
  h1: phrasing(),
  h2: phrasing(),
  h3: phrasing(),
  h4: phrasing(),
  h5: phrasing(),
  h6: phrasing(),
  i: phrasing(),
  kbd: phrasing(),
  label: phrasing(),
  mark: phrasing(),
  output: phrasing(),
  p: phrasing(),
  q: phrasing(),
  ruby: phrasing(),
  s: phrasing(),
  samp: phrasing(),
  small: phrasing(),
  span: phrasing(),
  strong: phrasing(),
  sub: phrasing(),
  sup: phrasing(),
  time: phrasing(),
  u: phrasing(),
  var: phrasing(),

  // Phrasing or heading (spec allows either as first child)
  legend: phrasingOrHeading(),
  summary: phrasingOrHeading(),
})

/* -------------------------------------------------------------------------- */
/* Runtime accessors                                                          */
/* -------------------------------------------------------------------------- */

export function getTagCategorySet(
  tagCategories: TagCategoryMap,
  tagName: string,
): CategorySet | undefined {
  return tagCategories[tagName]
}

export function getContentModelDefinition(
  contentModels: ContentModelMap,
  tagName: string,
): ContentModelDefinition | undefined {
  return contentModels[tagName]
}
