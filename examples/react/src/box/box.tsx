/**
 * Box — Tailwind layout component.
 *
 * Requires `praxis-kit/tailwind`. The `plugin: createTailwindPipeline`
 * field activates the Tailwind layout pipeline, which contributes two boolean
 * props (`flex` and `grid`) to every component that uses it. These props are
 * internal to the pipeline — they never reach the DOM — and act as layout-mode
 * switches that determine which Tailwind utility classes are emitted:
 *
 *   - `flex` — activates flex mode; strips grid-only classes (grid-cols-*, col-*, …)
 *   - `grid` — activates grid mode; strips flex-only classes (flex-*, grow, shrink, …)
 *   - neither — raw CVA output is returned with no filtering
 *
 * Gap classes (gap-*) are kept in both modes and stripped only when no layout
 * mode is active.
 *
 * The `flex`/`grid` props are typed automatically — they flow in via the plugin's
 * `ClassPlugin<LayoutProps>` return type and are merged into the component's prop
 * surface by `createContractComponent`. No explicit `LayoutProps` import is
 * needed at the definition site.
 */
import { createContractComponent } from 'praxis-kit/react'
import { createTailwindPipeline } from 'praxis-kit/tailwind'

const variants = {
  direction: {
    row: 'flex-row',
    col: 'flex-col',
  },
  align: {
    start: 'items-start',
    center: 'items-center',
    end: 'items-end',
    stretch: 'items-stretch',
  },
  gap: {
    none: 'gap-0',
    sm: 'gap-2',
    md: 'gap-4',
    lg: 'gap-8',
  },
  cols: {
    '2': 'grid-cols-2',
    '3': 'grid-cols-3',
    '4': 'grid-cols-4',
  },
} as const

export const Box = createContractComponent({
  tag: 'div',
  name: 'Box',
  styling: {
    plugin: createTailwindPipeline,
    variants,
    presets: {
      row: { direction: 'row', align: 'center', gap: 'md' },
      stack: { direction: 'col', gap: 'sm' },
    },
  },
})
