export type StringMap<T = unknown> = Record<string, T>

export type AnyRecord = StringMap<unknown>

export type EmptyRecord = Record<never, never>

/** A compound component's named sub-components, e.g. `{ Header, Content, Footer }`. */
export type SubComponentMap = Readonly<AnyRecord>
