import type { AnyRecord } from '@praxis-kit/primitive'
import type { ComponentType, ReactElement } from 'react'

export type UnknownProps = AnyRecord
export type SlotComponent = ComponentType<UnknownProps>
export type ResolvedProps = Readonly<UnknownProps>
export type { FilterPredicate } from '@praxis-kit/adapter-utils'

// A normalized child as seen by the ChildrenEvaluator and the built-in per-tag
// HTML content-model contracts. Non-empty text/number nodes are preserved
// alongside elements — those evaluators are designed to receive them (e.g.
// labelContract's `accessible-name` rule matches a plain string child). The
// asChild/Slot path narrows this back to elements itself.
export type NormalizedChild = ReactElement | string | number
export type NormalizeChildren = (children: unknown) => NormalizedChild[]
