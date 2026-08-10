import type { StringMap } from '@praxis-kit/primitive'

// Implicit ARIA roles for HTML elements, matching the runtime AriaPolicyEngine.
// Source: https://www.w3.org/TR/html-aam-1.0/#html-element-role-mappings
// Only elements with an unconditional implicit role are listed. Conditional
// mappings (e.g. <a> is "link" only when href is present) are excluded — the
// runtime engine handles those; a lint rule can only see the static tag name.
export const IMPLICIT_ROLES: Readonly<StringMap<string>> = {
  article: 'article',
  aside: 'complementary',
  button: 'button',
  datalist: 'listbox',
  details: 'group',
  dialog: 'dialog',
  figure: 'figure',
  form: 'form',
  h1: 'heading',
  h2: 'heading',
  h3: 'heading',
  h4: 'heading',
  h5: 'heading',
  h6: 'heading',
  hr: 'separator',
  img: 'img',
  li: 'listitem',
  main: 'main',
  math: 'math',
  menu: 'list',
  meter: 'meter',
  nav: 'navigation',
  ol: 'list',
  option: 'option',
  output: 'status',
  progress: 'progressbar',
  search: 'search',
  section: 'region',
  select: 'listbox',
  summary: 'button',
  table: 'table',
  tbody: 'rowgroup',
  td: 'cell',
  textarea: 'textbox',
  tfoot: 'rowgroup',
  th: 'columnheader',
  thead: 'rowgroup',
  tr: 'row',
  ul: 'list',
}
