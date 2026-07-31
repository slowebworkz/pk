import { isObject } from '../foundational'

/**
 * Well-known Symbol an adapter stamps onto a rendered DOM node to trace it
 * back to the runtime bundle that produced it.
 *
 * React/Vue vnodes carry the component reference on `.type`; Lit/web custom
 * elements are recoverable via `instanceof` against the registered class.
 * Svelte's `<Polymorphic>` has neither — it renders a generic
 * `<svelte:element>` with no built-in link back to the bundle that
 * configured it — so `Polymorphic.svelte` stamps this marker onto the host
 * element itself once mounted.
 */
export const BUNDLE_MARKER: unique symbol = Symbol.for('praxis.bundle-marker')

/**
 * Stamps `BUNDLE_MARKER` on a rendered DOM node, pointing at its source
 * bundle. `Object.defineProperty` accepts any object and any `PropertyKey`
 * by its own (generic, permissive) type signature, so this needs no cast —
 * the same reflective-write pattern `component-id.ts` uses to stamp
 * `COMPONENT_ID`/`COMPONENT_DEFAULT_TAG` onto components.
 */
export function markBundle(node: Element, bundle: unknown): void {
  Object.defineProperty(node, BUNDLE_MARKER, {
    value: bundle,
    writable: true,
    configurable: true,
    enumerable: false,
  })
}

/**
 * Reads `BUNDLE_MARKER` off a rendered DOM node, if present.
 * `Reflect.get` accepts any `object` and any `PropertyKey` by its own type
 * signature, so this needs no cast either.
 */
export function getBundleMarker(child: unknown): unknown {
  if (!isObject(child)) return undefined
  return Reflect.get(child, BUNDLE_MARKER)
}
