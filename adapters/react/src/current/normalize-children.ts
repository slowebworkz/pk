import { isValidElement } from 'react'

import type { NormalizedChild } from '../shared'

// React.Children.toArray is deprecated in React 19. Unlike that API, this
// implementation does not traverse <Fragment> boundaries — a fragment passed
// as the asChild child is treated as a single element and will fail the
// "exactly one element" validation rather than being silently flattened.
//
// Non-empty text/number children are kept alongside elements: this is the only
// normalizer wired into the shared render pipeline, and it feeds every
// contract's `enforcement.children` evaluation as well as the built-in per-tag
// HTML content-model contracts — both of which are designed to receive text
// nodes (labelContract's `accessible-name` rule matches a plain string child).
// The asChild/Slot path narrows back to elements itself (see resolveSlotChildren
// in shared/render.ts).
const isNonEmptyTextChild = (child: unknown): child is string | number =>
  typeof child === 'number' || (typeof child === 'string' && child.trim().length > 0)

export function normalizeChildren(children: unknown): NormalizedChild[] {
  if (isValidElement(children)) return [children]
  if (isNonEmptyTextChild(children)) return [children]
  if (Array.isArray(children)) {
    return children.filter(
      (child): child is NormalizedChild => isValidElement(child) || isNonEmptyTextChild(child),
    )
  }
  return []
}
