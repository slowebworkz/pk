// Public surface for the tag-resolution and base type guards praxis-kit uses internally
// (ARIA/contract enforcement, slot resolution). Consumers authoring custom `enforcement.children`
// or `enforcement.aria` rules need the same symbol-aware tag resolution praxis-kit already has
// in-house, rather than hand-rolling it against `COMPONENT_DEFAULT_TAG` themselves.
export { isObject, isString } from '@praxis-kit/primitive'
export { isTag, getTag, isFlowContent } from '@praxis-kit/primitive'
export type { TagChild, FlowContentChild } from '@praxis-kit/primitive'
// `isTag()` resolves a child's effective tag via `child.type[COMPONENT_DEFAULT_TAG]` — identity,
// not a hand-rolled description match (see the guards above). A plain wrapper function around a
// praxis-kit component (e.g. to narrow its prop types) is a *different* function object with no
// `COMPONENT_DEFAULT_TAG` of its own, so every `isTag()`-based check — built-in HTML contracts
// included — silently stops recognizing it as a valid child. `markComponentTag` stamps the symbol
// onto the wrapper so it's recognized the same way the original component was.
export {
  COMPONENT_DEFAULT_TAG,
  getComponentDefaultTag,
  markComponentTag,
} from '@praxis-kit/primitive'
