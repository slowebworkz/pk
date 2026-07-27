import type { ReadonlyDeep } from 'type-fest'
import type { IntrinsicProps } from '../primitives'
import type { AriaContext } from './aria-context'
import type { FixKind } from './fix-kind'

export type AriaFixResult =
  | { applied: false; next: ReadonlyDeep<IntrinsicProps> }
  | { applied: true; next: ReadonlyDeep<IntrinsicProps>; previous: ReadonlyDeep<IntrinsicProps> }

export type AriaFix = {
  readonly kind: FixKind
  /** The attribute a `'removeAttribute'`/`'injectLive'` fix targets — always set for those
   *  kinds, absent for kinds with no single-attribute target (`'removeRole'`, etc.). */
  readonly attribute?: string
  readonly priority?: number
  readonly source?: string
  readonly apply: (context: AriaContext) => AriaFixResult
}
