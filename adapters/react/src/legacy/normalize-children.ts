import { Children, isValidElement } from 'react'

import type { ReactNode } from 'react'
import type { NormalizedChild } from '../shared'

// Children.toArray is the appropriate API for React 18 and traverses <Fragment>
// boundaries, unlike the current/ implementation which uses plain array ops.
//
// Non-empty text/number children are kept alongside elements: this normalizer
// feeds every contract's `enforcement.children` evaluation and the built-in
// per-tag HTML content-model contracts, both designed to receive text nodes
// (labelContract's `accessible-name` rule matches a plain string child). The
// asChild/Slot path narrows back to elements itself (see resolveSlotChildren in
// shared/render.ts).
const isNonEmptyTextChild = (child: unknown): child is string | number =>
  typeof child === 'number' || (typeof child === 'string' && child.trim().length > 0)

export function normalizeChildren(children: unknown): NormalizedChild[] {
  return Children.toArray(children as ReactNode).filter(
    (child): child is NormalizedChild => isValidElement(child) || isNonEmptyTextChild(child),
  )
}
