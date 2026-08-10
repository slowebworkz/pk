import type { AnyRecord } from '@praxis-kit/core'
import type { ChildSpec } from './child-spec'

export type RenderResult = {
  /** The current root DOM element. Always reflects the latest render/rerender. */
  readonly element: HTMLElement
  /** Re-render the same component with new props and/or children. */
  rerender(props?: AnyRecord, children?: ChildSpec[]): void
  /** Unmount the component from the DOM. */
  unmount(): void
}
