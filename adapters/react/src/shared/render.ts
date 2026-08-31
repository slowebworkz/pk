/**
 * Shared React rendering pipeline.
 *
 * All React primitives (both the React 19 and React 18 adapters) render through this module.
 * Props are normalized into a `ResolvedRenderState`, optionally validated in development, then
 * dispatched to one of three render paths: render callback, Slot (`asChild`), or intrinsic
 * element.
 */
import { createElement, isValidElement } from 'react'
import { jsx } from 'react/jsx-runtime'

import { applyFilter, resolveNormalizedProps } from '@praxis-kit/adapter-utils'
import { enforceAllowedAs, isKnownAriaRole } from '@praxis-kit/core'
import { isFunction, lazy } from '@praxis-kit/primitive'

import { isSlottableElement } from './slot'

import type { ReactElement, Ref } from 'react'
import type { Writable } from 'type-fest'
import type { ElementType, IntrinsicProps } from '@praxis-kit/core'
import type { SlotValidator } from './slot'
import type {
  SlotComponent,
  Runtime,
  KnownProps,
  RenderInput,
  ResolvedProps,
  ResolvedSlotRender,
  RenderDirectives,
  ResolvedRenderState,
  FilterPredicate,
} from './types'

declare const process: { env: { NODE_ENV: string } }

/** Whether the current build is running in production mode. */
const isProduction = process.env.NODE_ENV === 'production'

/**
 * Constructs the canonical render state consumed by all render paths.
 *
 * `children` is only included when defined so that an omitted `children` prop remains
 * distinguishable from an explicitly provided value.
 */
function buildRenderState(
  tag: ElementType,
  directives: RenderDirectives,
  props: ResolvedProps,
  normalizedProps: ResolvedProps,
  className: string | undefined,
  children: unknown,
): ResolvedRenderState {
  const state: Writable<ResolvedRenderState> = {
    tag,
    directives,
    props,
    normalizedProps,
    className,
  }

  if (children !== undefined) state.children = children

  return state
}

/**
 * Resolves the component's render state.
 *
 * Applies tag resolution, prop merging and normalization, class resolution, prop filtering,
 * and render-directive extraction, producing the canonical state consumed by every render path.
 *
 * Prop normalization is delegated to the shared `resolveNormalizedProps` so ordering (HTML
 * built-ins first, then the primitive's composed normalizers and the caller's `normalize`) is
 * identical across every adapter and the SSR path.
 */
function prepareRenderState(
  runtime: Runtime,
  props: KnownProps,
  filterProps: FilterPredicate,
): ResolvedRenderState {
  const { as, asChild, render: _render, children, className, recipe, ...rest } = props

  const tag = runtime.resolveTag(as)

  if (runtime.options.allowedAs !== undefined && as !== undefined) {
    enforceAllowedAs(
      tag,
      runtime.options.allowedAs,
      runtime.options.diagnostics,
      runtime.options.displayName,
    )
  }

  const mergedProps = runtime.resolveProps(rest)
  const normalizedProps = resolveNormalizedProps(runtime.options, tag, mergedProps)

  const resolvedClass = runtime.resolveClasses(tag, normalizedProps, className, recipe)
  const filteredProps = applyFilter(normalizedProps, filterProps, runtime.options.variantKeys)

  const directives: RenderDirectives = {
    ...(as !== undefined && { as }),
    ...(asChild !== undefined && { asChild }),
  }

  return buildRenderState(tag, directives, filteredProps, normalizedProps, resolvedClass, children)
}

/**
 * Warns when child normalization discards one or more children from an array.
 *
 * Non-array children are ignored because normalization of a single child cannot represent
 * discarded siblings.
 */
function warnDiscardedChildren(
  originalChildren: unknown,
  normalizedChildren: ReactElement[],
  validator: SlotValidator,
): void {
  if (!Array.isArray(originalChildren)) return

  const discarded = originalChildren.length - normalizedChildren.length

  if (discarded > 0) validator.warnDiscardedChildren(discarded)
}

/** Narrows a normalized child array containing exactly one element. */
function isSingleElementArray(arr: ReactElement[]): arr is [ReactElement] {
  return arr.length === 1
}

/**
 * Resolves normalized children for the Slot render path.
 *
 * A single child is returned directly. Multiple children are permitted when a `Slottable`
 * element is present, allowing Slot to perform its sibling-merge behavior.
 *
 * If the single-child contract fails, the configured validator determines whether rendering
 * throws or falls back to intrinsic rendering.
 */
function resolveSlotChildren(
  children: unknown,
  normalized: ReactElement[],
  validator: SlotValidator,
): ReactElement | ReactElement[] | null {
  warnDiscardedChildren(children, normalized, validator)

  if (isSingleElementArray(normalized)) {
    return normalized[0]
  }

  // Slot handles the merge for the slottable sibling pattern.
  if (normalized.length > 1 && normalized.some(isSlottableElement)) {
    return normalized
  }

  validator.assertSingleChild(normalized.length)

  return null
}

/**
 * Validates the `asChild` and `as` rendering directives.
 *
 * Returns `true` when `asChild` can take ownership of rendering. Supplying both `as` and
 * `asChild` is invalid; in non-throw diagnostic modes, validation returns control to the
 * intrinsic render path.
 */
function validateSlotDirectives(directives: RenderDirectives, validator: SlotValidator): boolean {
  const { as, asChild } = directives

  if (!asChild) return false

  if (as !== undefined) {
    validator.assertExclusive()
    return false
  }

  return true
}

/**
 * Resolves the Slot render request.
 *
 * Returns `null` when `asChild` is inactive, its directives are invalid, or validation permits
 * falling back to intrinsic rendering.
 */
function resolveSlotRender(
  state: ResolvedRenderState,
  getNormalized: () => ReactElement[],
  validator: SlotValidator,
): ResolvedSlotRender | null {
  if (!validateSlotDirectives(state.directives, validator)) return null

  const child = resolveSlotChildren(state.children, getNormalized(), validator)

  if (child === null) return null

  return { child }
}

/**
 * Renders a resolved Slot request.
 *
 * The Slot receives the filtered props, resolved class name, forwarded ref, and resolved child.
 * Slot is responsible for merging those values onto the slotted element.
 */
function renderResolvedSlot(
  slotComponent: SlotComponent,
  state: ResolvedRenderState,
  resolved: ResolvedSlotRender,
  ref: Ref<unknown> | null,
): ReactElement {
  return jsx(slotComponent, {
    ...state.props,
    className: state.className,
    ref,
    children: resolved.child,
  })
}

/**
 * Attempts the `asChild` render path.
 *
 * Returns the rendered Slot when `asChild` is valid and its child contract succeeds. Returns
 * `null` when Slot rendering does not apply or validation permits intrinsic-render fallback.
 */
function tryRenderAsChild(
  state: ResolvedRenderState,
  ref: Ref<unknown> | null,
  slotComponent: SlotComponent,
  getNormalized: () => ReactElement[],
  validator: SlotValidator,
): ReactElement | null {
  const resolved = resolveSlotRender(state, getNormalized, validator)

  if (resolved === null) return null

  return renderResolvedSlot(slotComponent, state, resolved, ref)
}

/**
 * Constructs the props passed to the resolved render target.
 *
 * `role` is handled separately so that only recognized ARIA roles are emitted. `children` is
 * included only when it was supplied to the primitive.
 */
function buildElementProps(
  props: ResolvedProps,
  className: string | undefined,
  ref: Ref<unknown> | null,
  children: unknown,
): IntrinsicProps {
  const { role, ...rest } = props

  return {
    ...rest,
    className,
    ref,
    ...(children !== undefined && { children }),
    ...(isKnownAriaRole(role) && { role }),
  }
}

/**
 * Renders the resolved intrinsic or custom component target.
 *
 * Intrinsic HTML elements receive element-specific ARIA resolution. Custom component targets
 * receive the resolved props directly.
 */
function renderIntrinsic(
  state: ResolvedRenderState,
  ref: Ref<unknown> | null,
  runtime: Runtime,
): ReactElement {
  const elementProps = buildElementProps(state.props, state.className, ref, state.children)

  const domProps =
    typeof state.tag === 'string'
      ? runtime.resolveAria(state.tag, elementProps, state.normalizedProps).props
      : elementProps

  return createElement(state.tag, domProps)
}

/**
 * Renders a React primitive through the shared Praxis Kit pipeline.
 *
 * The render paths are evaluated in the following order:
 *
 * 1. `render` callback — delegates final rendering to the caller.
 * 2. `asChild` — delegates rendering to Slot.
 * 3. Intrinsic/custom element — renders the resolved `state.tag`.
 *
 * Development-only intrinsic children validation is skipped when rendering is delegated because
 * the primitive does not render its own `state.tag` in those paths. `asChild` performs its own
 * single-child validation through `SlotValidator`.
 *
 * When both `as` and `asChild` are supplied, the combination is invalid. In non-throw diagnostic
 * modes, rendering falls back to the resolved `state.tag`, so intrinsic validation applies.
 *
 * Child normalization is lazy and shared between development validation and Slot rendering,
 * ensuring that it runs at most once per render.
 */
export function render<TProps extends KnownProps>({
  runtime,
  props,
  ref,
  slotComponent,
  normalizeChildren,
  filterProps,
  slotValidator,
  childrenEvaluator,
}: RenderInput<TProps>): ReactElement {
  const state = prepareRenderState(runtime, props, filterProps)

  /**
   * Lazily normalizes children on first access.
   *
   * The same result is shared by development validation and the Slot render path, avoiding
   * duplicate normalization work. The evaluators get the full list, text nodes included — they
   * are designed to match text (e.g. `labelContract`'s `accessible-name` rule) — while the
   * asChild/Slot path narrows back to elements, since it only ever composes onto one.
   */
  const getNormalizedChildren = lazy(() => normalizeChildren(state.children))
  const getSlotChildren = lazy(() => getNormalizedChildren().filter(isValidElement))

  /**
   * Whether final rendering is delegated away from the primitive's resolved tag.
   *
   * A render callback owns the final output directly. A valid `asChild` delegates output to Slot.
   * In either case, intrinsic HTML content-model and `enforcement.children` contracts do not
   * apply to the pre-render children because those contracts describe `state.tag`.
   */
  const delegatesRendering =
    isFunction(props.render) ||
    (state.directives.asChild === true && state.directives.as === undefined)

  if (!isProduction && !delegatesRendering) {
    childrenEvaluator?.evaluate(getNormalizedChildren(), {
      tag: state.tag,
      props: state.normalizedProps,
    })

    runtime.options.htmlChildrenEvaluatorFn?.(state.tag)?.evaluate(getNormalizedChildren(), {
      tag: state.tag,
      props: state.normalizedProps,
    })
  }

  /**
   * Render callbacks take precedence over all other render paths.
   *
   * The callback receives the resolved props, resolved class name, and forwarded ref. It owns
   * the final rendered output and bypasses both Slot and intrinsic rendering.
   */
  if (isFunction(props.render)) {
    return props.render({ ...state.props, className: state.className, ref })
  }

  const slotResult = tryRenderAsChild(state, ref, slotComponent, getSlotChildren, slotValidator)

  return slotResult ?? renderIntrinsic(state, ref, runtime)
}
