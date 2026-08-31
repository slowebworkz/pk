import type { AnyRecord, ElementType, NormalizeFn, PropNormalizer } from '@praxis-kit/core'

/**
 * The subset of the resolved runtime options that {@link resolveNormalizedProps}
 * reads. Kept structural so every adapter's own `runtime.options` type satisfies
 * it without a shared nominal import.
 */
export interface NormalizeCapableOptions {
  // `tag: ElementType` (not `unknown`) so both callers satisfy it: the resolved
  // factory options declare `(tag: unknown) => …` (assignable here — a handler
  // that accepts anything accepts an ElementType), and the SSR runtime's local
  // shape declares `(tag: ElementType) => …` (an exact match).
  readonly htmlPropNormalizersFn?:
    ((tag: ElementType) => readonly PropNormalizer[] | undefined) | undefined
  readonly normalizeFn?: NormalizeFn | undefined
}

/**
 * The single canonical prop-normalization step for every render path — the five
 * VDOM adapters (React, Preact, Vue, Solid, Svelte) and the host-state path
 * shared by Lit, Web, and SSR.
 *
 * Ordering is fixed and load-bearing:
 *
 * ```text
 * mergedProps  →  HTML built-in normalizers  →  normalizeFn
 * ```
 *
 * `normalizeFn` is the primitive's composed `enforcement.props` normalizers plus
 * the caller's `normalize` option (folded together by `composeNormalizers`).
 * Running it last means a caller's `normalize` always observes — and can
 * override — an HTML built-in's output for the same key. This must be identical
 * across adapters: the same component with the same props has to normalize the
 * same way whether it renders through React or through SSR.
 *
 * `mergedProps` must already be the result of `runtime.resolveProps(rest)`. The
 * input object is never mutated; a copy is taken only when an HTML normalizer
 * actually runs — most tags have none (`htmlPropNormalizersFn` returns
 * `undefined` for every non-form element).
 */
export function resolveNormalizedProps(
  options: NormalizeCapableOptions,
  tag: ElementType,
  mergedProps: AnyRecord,
): AnyRecord {
  const htmlNormalizers = options.htmlPropNormalizersFn?.(tag)
  let base = mergedProps
  if (htmlNormalizers?.length) {
    base = { ...mergedProps }
    for (const normalize of htmlNormalizers) Object.assign(base, normalize(base))
  }
  return typeof options.normalizeFn === 'function' ? options.normalizeFn(base) : base
}
