import type { IntrinsicTag } from './intrinsic-tag'

export type ElementType = IntrinsicTag | (string & {})

/**
 * Resolves a component's default tag to its real DOM interface — `HTMLDialogElement` for
 * `'dialog'`, `HTMLDetailsElement` for `'details'`, and so on — falling back to `HTMLElement`
 * for custom-element tags or anything not in `HTMLElementTagNameMap`. Used to type
 * `FactoryOptions.onElement`'s `element` param so component authors get direct, correctly-typed
 * access to tag-specific native members (`dialogEl.showModal()`) without an unsafe cast.
 *
 * The fallback is `HTMLElement`, not the more generic `Element` — every tag reachable through
 * `IntrinsicTag` extends it, and so does every custom element per spec, so members `HTMLElement`
 * itself declares (`showPopover()`/`hidePopover()`/`togglePopover()`, the `popover` attribute)
 * stay directly accessible even for tags with no dedicated entry in `HTMLElementTagNameMap`.
 */
export type ElementForTag<TDefault extends ElementType> =
  TDefault extends keyof HTMLElementTagNameMap ? HTMLElementTagNameMap[TDefault] : HTMLElement
