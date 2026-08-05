import type {
  AnyRecord,
  EmptyRecord,
  MergeRecords,
  NoPluginProps,
  NoPreset,
  NoVariants,
  StringMap,
  SubComponentMap,
} from '../any-record'
import type { AnyFunction } from '../any-function'
import type { ElementForTag, ElementType } from '../element-type'
import type { Factory, UnaryFn } from '../function-types'
import type { IntrinsicTag } from '../intrinsic-tag'
import type { AnyRef, RefCallback, RefObject } from '../ref'
import type { KnownAriaRole } from '../../constants'

export type {
  AnyRecord,
  EmptyRecord,
  MergeRecords,
  NoPluginProps,
  NoPreset,
  NoVariants,
  StringMap,
  SubComponentMap,
}
export type { AnyFunction }
export type { ElementForTag, ElementType }
export type { Factory, UnaryFn }
export type { IntrinsicTag }
export type { AnyRef, RefCallback, RefObject }
export type { KnownAriaRole }

export type Booleanish = boolean | 'true' | 'false'
export type ClassName = string | string[]
export type NonEmptyArray<T> = [T, ...T[]]
export type Numberish = number | `${number}`
export type Primitive = string | number | boolean

export type AriaRole = KnownAriaRole | (string & {})

export type DefaultProps<T> = T extends AnyRecord ? Partial<T> : never

export type IntrinsicProps = AnyRecord & { role?: AriaRole }

export type PropsWithRole = Readonly<IntrinsicProps & { role: string }>

export type TagMap = Partial<Record<IntrinsicTag | (string & {}), ClassName>>
