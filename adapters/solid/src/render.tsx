import { applyFilter } from '@praxis-kit/adapter-utils'
import type { ElementType, IntrinsicProps } from '@praxis-kit/core'
import { enforceAllowedAs, isKnownAriaRole } from '@praxis-kit/core'
import { isString } from '@praxis-kit/primitive'
import { createEffect, createMemo, splitProps } from 'solid-js'
import { Dynamic } from 'solid-js/web'
import type { SlotValidator } from './slot'
import type {
  KnownProps,
  RenderInput,
  ResolvedProps,
  Runtime,
  SolidElement,
  UnknownProps,
} from './types'

declare const process: { env: { NODE_ENV: string } }

// Keys consumed by the adapter — split from pass-through DOM props.
const SPLIT_KEYS = ['as', 'asChild', 'children', 'class', 'recipe', 'ref'] as const

function toChildArray(children: unknown): unknown[] {
  if (children === undefined || children === null) return []
  if (Array.isArray(children)) return children
  return [children]
}

function buildElementProps(
  props: ResolvedProps,
  classStr: string | undefined,
  ref: unknown,
  children: unknown,
): IntrinsicProps {
  const { role, ...rest } = props
  return {
    ...rest,
    class: classStr,
    ...(ref !== undefined && { ref }),
    ...(children !== undefined && { children }),
    ...(isKnownAriaRole(role) && { role }),
  }
}

// Slot props handed to the render function: fully resolved DOM props + class.
// ref is included so the render fn can forward it to the actual DOM element.
// children is excluded — the render fn decides its own children.
function buildSlotProps(
  props: ResolvedProps,
  classStr: string | undefined,
  ref: unknown,
): UnknownProps {
  const { role, ...rest } = props
  return {
    ...rest,
    class: classStr,
    ...(ref !== undefined && { ref }),
    ...(isKnownAriaRole(role) && { role }),
  }
}

function resolveTag(runtime: Runtime, as: unknown): ElementType {
  return runtime.resolveTag(as as ElementType | undefined)
}

function resolveDomProps(
  tag: ElementType,
  elementProps: IntrinsicProps,
  runtime: Runtime,
  normalizedProps: IntrinsicProps,
): UnknownProps {
  return isString(tag)
    ? (runtime.resolveAria(tag, elementProps, normalizedProps).props as UnknownProps)
    : (elementProps as UnknownProps)
}

function tryRenderAsChild(
  known: KnownProps,
  filteredProps: () => ResolvedProps,
  resolvedClass: () => string | undefined,
  slotValidator: SlotValidator,
): SolidElement | null {
  if (!known.asChild) return null
  if (known.as !== undefined) {
    slotValidator.assertExclusive()
    return null
  }
  if (!slotValidator.assertRenderFn(known.children)) return null
  const renderFn = known.children as (p: UnknownProps) => SolidElement
  // createMemo tracks filteredProps() and resolvedClass() so slot props stay reactive.
  return createMemo(() =>
    renderFn(buildSlotProps(filteredProps(), resolvedClass(), known.ref)),
  ) as unknown as SolidElement
}

export function render<TProps extends KnownProps>({
  runtime,
  props,
  filterProps,
  slotValidator,
  childrenEvaluator,
}: RenderInput<TProps>): SolidElement {
  const [knownRaw, rest] = splitProps(props, SPLIT_KEYS)
  const known = knownRaw as unknown as KnownProps

  const tag = createMemo(() => resolveTag(runtime, known.as))
  const mergedProps = createMemo(() => runtime.resolveProps(rest as UnknownProps))
  const normalizedProps = createMemo(() => {
    const base = runtime.options.normalizeFn
      ? runtime.options.normalizeFn(mergedProps())
      : mergedProps()
    const htmlNormalizers = runtime.options.htmlPropNormalizersFn?.(tag())
    return htmlNormalizers?.length
      ? htmlNormalizers.reduce((acc, fn) => ({ ...acc, ...fn(acc) }), base)
      : base
  })
  const resolvedClass = createMemo(() =>
    runtime.resolveClasses(
      tag(),
      normalizedProps(),
      known.class as string | undefined,
      known.recipe as string | undefined,
    ),
  )
  const filteredProps = createMemo(() =>
    applyFilter(normalizedProps(), filterProps, runtime.options.variantKeys),
  )

  const { allowedAs } = runtime.options
  if (allowedAs !== undefined) {
    // createEffect so enforcement re-runs reactively when tag() changes.
    createEffect(() =>
      enforceAllowedAs(tag(), allowedAs, runtime.options.diagnostics, runtime.options.displayName),
    )
  }

  // createEffect so validation re-runs reactively when known.children or tag() changes —
  // tag() is read here (not just inside childrenEvaluator) so a dynamic(...) cardinality
  // rule that varies by `as` re-resolves whenever the resolved tag changes.
  if (process.env.NODE_ENV !== 'production' && childrenEvaluator) {
    createEffect(() =>
      childrenEvaluator.evaluate(toChildArray(known.children), {
        tag: tag(),
        props: normalizedProps(),
      }),
    )
  }

  if (process.env.NODE_ENV !== 'production') {
    createEffect(() =>
      runtime.options
        .htmlChildrenEvaluatorFn?.(tag())
        ?.evaluate(toChildArray(known.children), { tag: tag(), props: normalizedProps() }),
    )
  }

  const slotResult = tryRenderAsChild(known, filteredProps, resolvedClass, slotValidator)
  if (slotResult !== null) return slotResult

  const domProps = createMemo(() => {
    const ep = buildElementProps(filteredProps(), resolvedClass(), known.ref, known.children)
    return resolveDomProps(tag(), ep, runtime, normalizedProps())
  })

  // Dynamic dispatch — tag() and domProps() called directly in JSX so Solid's babel
  // transform wraps them in reactive getters, preserving fine-grained DOM updates.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return <Dynamic component={tag() as any} {...(domProps() as any)} />
}
