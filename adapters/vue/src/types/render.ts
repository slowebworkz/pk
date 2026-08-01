import type { ChildrenEvaluator, ElementType } from '@praxis-kit/core'
import type { Slots } from 'vue'
import type { SlotValidator } from '../slot'
import type { ResolvedProps } from './primitives'
import type { AsProp, AsChildProp } from './props'
import type { Runtime } from './runtime'

export type RenderDirectives = Readonly<AsProp & AsChildProp>

export type ResolvedRenderState = Readonly<{
  tag: ElementType
  directives: RenderDirectives
  className: string | undefined
  props: ResolvedProps
  // Props after normalization but before filtering. Used by childrenEvaluator's
  // dynamic(...) rules, which require the complete normalized prop set rather than
  // the DOM-bound subset in `props`.
  normalizedProps: ResolvedProps
}>

export type RenderInput = Readonly<{
  runtime: Runtime
  state: ResolvedRenderState
  slots: Slots
  slotValidator: SlotValidator
  childrenEvaluator?: ChildrenEvaluator
  /** Vue function-ref capturing the real rendered element, for `FactoryOptions.onElement`. */
  elementRef?: ((element: Element | null) => void) | undefined
}>
