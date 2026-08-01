import { applyFilter } from '@praxis-kit/adapter-utils'
import type { ElementType } from '@praxis-kit/core'
import { enforceAllowedAs, isKnownAriaRole } from '@praxis-kit/core'
import type { AnyRecord } from '@praxis-kit/primitive'
import { isNumber, isString } from '@praxis-kit/primitive'
import type { Slots, VNode, VNodeRef } from 'vue'
import { cloneVNode, h } from 'vue'
import { normalizeChildren } from './normalize-children'
import type { SlotValidator } from './slot'
import { extractSlottable } from './slot/extractSlottable'
import type {
  FilterPredicate,
  KnownProps,
  RenderDirectives,
  RenderInput,
  ResolvedRenderState,
  Runtime,
} from './types'

declare const process: { env: { NODE_ENV: string } }

// Vue's hyphenate converts onKeyDown → 'key-down' (invalid event name).
// Normalize multi-word camelCase handlers to all-lowercase: onKeyDown → onKeydown.
const MULTI_WORD_EVENT_RE = /^on[A-Z][a-z]+[A-Z]/

function normalizeListenerKeys(props: AnyRecord): AnyRecord {
  const out: AnyRecord = {}
  for (const k in props) {
    out[MULTI_WORD_EVENT_RE.test(k) ? 'on' + k.slice(2).toLowerCase() : k] = props[k]
  }
  return out
}

function isAttributeValue(v: unknown): v is string | number | boolean {
  return isString(v) || isNumber(v) || typeof v === 'boolean'
}

// The asChild path only ever forwarded plain attributes onto the cloned child — never
// listeners or style objects — matching the pre-pipeline-kit decoration model's behavior.
function pickAttributes(props: AnyRecord): AnyRecord {
  const out: AnyRecord = {}
  for (const k in props) {
    if (isAttributeValue(props[k])) out[k] = props[k]
  }
  return out
}

export function prepareRenderState(
  runtime: Runtime,
  attrs: KnownProps,
  filterProps: FilterPredicate,
): ResolvedRenderState {
  const { as, asChild, class: callerClass, recipe, ...rest } = attrs

  const tag: ElementType = typeof as === 'string' ? as : runtime.options.defaultTag
  if (runtime.options.allowedAs !== undefined) {
    enforceAllowedAs(
      tag,
      runtime.options.allowedAs,
      runtime.options.diagnostics,
      runtime.options.displayName,
    )
  }

  const mergedProps = runtime.resolveProps(rest)
  const htmlNormalizers = runtime.options.htmlPropNormalizersFn?.(tag)
  const htmlNormalizedProps = htmlNormalizers?.length
    ? htmlNormalizers.reduce((acc, fn) => ({ ...acc, ...fn(acc) }), mergedProps)
    : mergedProps
  const normalizedProps = runtime.options.normalizeFn
    ? runtime.options.normalizeFn(htmlNormalizedProps)
    : htmlNormalizedProps

  const className = runtime.resolveClasses(tag, normalizedProps, callerClass, recipe)
  const filteredProps = applyFilter(normalizedProps, filterProps, runtime.options.variantKeys)

  return {
    tag,
    directives: {
      ...(typeof as === 'string' && { as }),
      ...(asChild !== undefined && { asChild }),
    },
    props: filteredProps,
    normalizedProps,
    className,
  }
}

function buildElementProps(
  props: AnyRecord,
  className: string | undefined,
  elementRef: ((element: Element | null) => void) | undefined,
): AnyRecord {
  const { role, ...rest } = props
  return {
    ...normalizeListenerKeys(rest),
    // Vue's SSR renderer and its client-side patcher disagree on `class: undefined` — SSR's
    // normalizeClass turns it into '' and still emits class="", while the client patcher
    // removes the attribute outright. Omitting the key entirely keeps both paths consistent.
    ...(className !== undefined && { class: className }),
    ...(isKnownAriaRole(role) && { role }),
    // Vue calls a function-ref with the element on mount and with null on unmount, same
    // contract as React/Preact's callback refs — a natural fit for FactoryOptions.onElement.
    // Cast: Vue's own VNodeRef type also accepts a resolved *component* instance, since refs
    // can target components as well as elements — irrelevant here, this is only ever attached
    // to an intrinsic host tag, which always resolves to a real Element.
    ...(elementRef !== undefined && { ref: elementRef as unknown as VNodeRef }),
  }
}

function renderIntrinsic(
  state: ResolvedRenderState,
  runtime: Runtime,
  slots: Slots,
  elementRef: ((element: Element | null) => void) | undefined,
): VNode {
  const elementProps = buildElementProps(state.props, state.className, elementRef)
  const domProps = runtime.resolveAria(state.tag as string, elementProps).props
  return h(state.tag, domProps, slots.default ? { default: slots.default } : undefined)
}

function validateSlotDirectives(directives: RenderDirectives, validator: SlotValidator): boolean {
  const { as, asChild } = directives
  if (!asChild) return false
  if (as !== undefined) {
    validator.assertExclusive()
    // Non-throw modes: warned and fell through — render normally as a fallback.
    return false
  }
  return true
}

function tryRenderAsChild(
  state: ResolvedRenderState,
  children: VNode[],
  discarded: number,
  validator: SlotValidator,
  elementRef: ((element: Element | null) => void) | undefined,
): VNode | null {
  if (!validateSlotDirectives(state.directives, validator)) return null

  if (discarded > 0) validator.warnDiscardedChildren(discarded)

  const attrs = {
    ...pickAttributes(state.props),
    ...(state.className !== undefined && { class: state.className }),
    ...(elementRef !== undefined && { ref: elementRef as unknown as VNodeRef }),
  }

  const slottable = extractSlottable(children)
  if (slottable) return slottable.rebuild(cloneVNode(slottable.child, attrs))

  if (children.length === 1 && children[0] !== undefined) {
    return cloneVNode(children[0], attrs)
  }

  // Non-throw modes: warned and fell through — render normally as a fallback.
  validator.assertSingleChild(children.length)
  return null
}

export function render({
  runtime,
  state,
  slots,
  slotValidator,
  childrenEvaluator,
  elementRef,
}: RenderInput): VNode {
  const { vnodes: children, discarded } = normalizeChildren(slots)

  if (process.env.NODE_ENV !== 'production') {
    childrenEvaluator?.evaluate(children, { tag: state.tag, props: state.normalizedProps })
    runtime.options
      .htmlChildrenEvaluatorFn?.(state.tag)
      ?.evaluate(children, { tag: state.tag, props: state.normalizedProps })
  }

  const slotResult = tryRenderAsChild(state, children, discarded, slotValidator, elementRef)
  return slotResult ?? renderIntrinsic(state, runtime, slots, elementRef)
}
