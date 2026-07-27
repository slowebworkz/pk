/**
 * HTML void elements.
 *
 * Void elements cannot have child nodes and therefore all share the same
 * empty content model — a WHATWG-stable fact, not a praxis-kit opinion.
 * Single source of truth shared by the contract engine's built-in void-tag
 * children contract (`@praxis-kit/core`'s `VOID_TAGS` re-export) and the
 * Tailwind pipeline's flex/grid-on-void-tag warning, so the two can't drift.
 */
export const VOID_TAGS = [
  'area',
  'base',
  'br',
  'col',
  'embed',
  'hr',
  'img',
  'input',
  'link',
  'meta',
  'param',
  'source',
  'track',
  'wbr',
] as const
