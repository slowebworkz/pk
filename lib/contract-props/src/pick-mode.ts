import type { Mode } from './mode'

/**
 * Selects the concrete prop shape for a render mode.
 *
 * The prop shapes themselves remain adapter-specific (see the README for why); this helper only
 * centralizes the `Mode extends ... ? ... : ...` dispatch itself.
 *
 * Adapters that don't support a mode (e.g. Preact has no `'render'`) pass `never` for that slot
 * and narrow their own `Mode` type parameter to exclude it.
 */
export type PickMode<M extends Mode, TNormal, TAsChild, TRender> = M extends 'asChild'
  ? TAsChild
  : M extends 'render'
    ? TRender
    : TNormal
