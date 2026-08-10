import type { AnyRecord, StringMap } from '@praxis-kit/primitive'

export type UnknownProps = AnyRecord
export type ResolvedProps = Readonly<UnknownProps>

// Resolved DOM attribute values built for spreading onto <svelte:element> or a
// slot render-prop (buildDomProps/buildSlotProps in Polymorphic.svelte) — distinct
// role from UnknownProps (arbitrary input props) even though the shape is identical.
export type ResolvedAttributes = AnyRecord

// Canonical shape for a `style` prop object (serializeStyle in Polymorphic.svelte).
// Not @praxis-kit/runtime's StyleMap — that belongs to the legacy decoration model
// other adapters are moving away from; this is a local, Svelte-only equivalent.
export type StyleValue = string | number
export type StyleObject = Partial<StringMap<StyleValue | null | undefined>>

export type { FilterPredicate } from '@praxis-kit/adapter-utils'
