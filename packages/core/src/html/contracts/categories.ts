import { VOID_TAGS } from '@praxis-kit/primitive'
import type { HtmlTags } from './types'

/**
 * HTML content-model tag groups shared across multiple contracts.
 *
 * Shared here means referenced by more than one contract, or by the top-level
 * tag → contract map in `index.ts`. Contract-specific tag lists that only one
 * module needs (e.g. `pContract`'s block-level blocklist) stay local to that module.
 */

/**
 * HTML elements classified as metadata content.
 *
 * Metadata content (`<script>` and `<template>`) is permitted in almost every
 * HTML content model and is therefore accepted by many contracts.
 */
export const METADATA_TAGS = ['script', 'template'] as const satisfies HtmlTags

/**
 * HTML void elements — re-exported from `@praxis-kit/primitive`, the single
 * source of truth also consulted by the Tailwind pipeline's flex/grid-on-void-tag
 * warning. Void elements cannot have child nodes and therefore all share the
 * same empty content model.
 */
export { VOID_TAGS }

/**
 * Elements whose content model is character data only.
 *
 * Includes raw text elements (`<script>`, `<style>`), escapable raw text
 * elements (`<textarea>`, `<title>`), and `<option>`.
 */
export const TEXT_ONLY_TAGS = [
  'option',
  'script',
  'style',
  'textarea',
  'title',
] as const satisfies HtmlTags

/**
 * HTML elements with implicit landmark roles.
 *
 * `<section>` and `<form>` are intentionally excluded because their landmark
 * semantics depend on having an accessible name.
 */
export const LANDMARK_TAGS = [
  'article',
  'aside',
  'footer',
  'header',
  'main',
  'nav',
] as const satisfies HtmlTags

/**
 * Interactive content as defined by the HTML Living Standard.
 *
 * Used to enforce restrictions such as "must not contain interactive content"
 * for elements like `<button>` and `<a>`.
 *
 * Only direct children are checked; descendant traversal is outside the scope
 * of the contract engine.
 */
export const INTERACTIVE_CONTENT_TAGS = [
  'a',
  'button',
  'input',
  'select',
  'textarea',
  'label',
] as const satisfies HtmlTags

/**
 * HTML labelable form controls.
 *
 * Used by `<label>` to validate implicit and explicit control associations.
 * `input[type="hidden"]` is excluded separately because labelability depends
 * on element attributes rather than tag name alone.
 */
export const LABELABLE_TAGS = [
  'button',
  'input',
  'meter',
  'output',
  'progress',
  'select',
  'textarea',
] as const satisfies HtmlTags

/**
 * Interactive elements that are never labelable.
 *
 * Used by `labelContract` to enforce the HTML rule that a `<label>` may contain
 * no interactive content other than its labeled control.
 *
 * Conditionally interactive elements (for example, `audio[controls]`) are
 * excluded because their interactivity depends on attributes rather than tag
 * name alone.
 */
export const OTHER_INTERACTIVE_TAGS = [
  'a',
  'details',
  'embed',
  'iframe',
] as const satisfies HtmlTags

/**
 * Elements that implicitly terminate a `<p>` element.
 *
 * This contract intentionally uses a blocklist rather than attempting to model
 * the full phrasing-content category. Missing an obscure block-level element is
 * preferable to rejecting valid inline content because the allowlist is
 * incomplete.
 */
export const P_BLOCKED_TAGS = [
  'address',
  'article',
  'aside',
  'blockquote',
  'details',
  'dialog',
  'div',
  'dl',
  'fieldset',
  'figure',
  'footer',
  'form',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'header',
  'hr',
  'main',
  'nav',
  'ol',
  'p',
  'pre',
  'section',
  'table',
  'ul',
] as const satisfies HtmlTags
