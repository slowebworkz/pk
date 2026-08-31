import type { LayoutFamily, LayoutKey } from './layout'
import type { LAYOUT_FAMILY_MAP } from '../constants'
import type { layoutKeys } from '../layout-keys'
import type { EmptyRecord } from '@praxis-kit/primitive'
import type { Simplify, ValueOf } from 'type-fest'
export type ClassToken = string

type Token<TKind extends string, TData extends object = EmptyRecord> = {
  kind: TKind
  raw: string
} & TData

type TokenData = {
  layout: { value: LayoutKey<typeof layoutKeys> }
  conditional: { requires: Exclude<LayoutFamily<typeof LAYOUT_FAMILY_MAP>, 'none'> }
  gap: EmptyRecord
  // Flex/grid *item* properties (align-self, order, grid-row/column, flex-grow,
  // ...). These resolve against the element's PARENT display mode, which this
  // plugin can't observe, so they must never be stripped by own-family filtering.
  item: EmptyRecord
  shared: EmptyRecord
  utility: { base: string }
}

type TokenMap = {
  [K in keyof TokenData]: Token<K, TokenData[K]>
}

export type LayoutToken = TokenMap['layout']
export type ConditionalToken = TokenMap['conditional']
export type GapToken = TokenMap['gap']
export type ItemToken = TokenMap['item']
export type SharedToken = TokenMap['shared']
export type UtilityToken = TokenMap['utility']

export type ClassifiedToken = Simplify<ValueOf<TokenMap>>
