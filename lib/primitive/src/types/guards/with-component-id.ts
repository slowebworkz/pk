import type { Simplify } from 'type-fest'

/**
 * Generic building block for a "component carries this metadata symbol" shape —
 * parameterized over the actual symbol keys so this file has no dependency on
 * where those symbols are defined or what they're called. The concrete alias
 * (`WithComponentId`, instantiated with `COMPONENT_ID`/`COMPONENT_DEFAULT_TAG`)
 * lives next to those symbols in `guards/children/component-id.ts`.
 * `Simplify` collapses the intersection into one flat object type, so IDE hover
 * shows `{ [COMPONENT_ID]?: symbol; [COMPONENT_DEFAULT_TAG]?: string }` instead
 * of the raw `A & B` shape.
 */
export type WithComponentMetadata<TIdKey extends symbol, TTagKey extends symbol> = Simplify<
  { [K in TIdKey]?: symbol } & { [K in TTagKey]?: string }
>
