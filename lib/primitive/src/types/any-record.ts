/**
 * A string-keyed object whose values are of type `T`.
 */
export type StringMap<T = unknown> = Record<string, T>

/**
 * A string-keyed object with values of unknown type.
 */
export type AnyRecord = StringMap<unknown>

/**
 * An object type with no named properties.
 *
 * Unlike `{}`, this excludes arbitrary properties during type operations while
 * still satisfying `extends object`.
 */
export type EmptyRecord = Record<never, never>

/**
 * A compound component's named sub-components, for example
 * `{ Header, Content, Footer }`.
 */
export type SubComponentMap = Readonly<AnyRecord>

/**
 * Default `Variants` type for components that declare no variants.
 *
 * Structurally identical to `Readonly<EmptyRecord>`, but named separately so
 * editor hovers remain self-descriptive.
 */
export type NoVariants = Readonly<EmptyRecord>

/**
 * Default `TPreset` type for components that declare no named presets.
 *
 * Structurally identical to `Readonly<EmptyRecord>`, but named separately so
 * editor hovers remain self-descriptive.
 */
export type NoPreset = Readonly<EmptyRecord>

/**
 * Fallback for `ExtractPluginProps<TPlugin>` when a plugin contributes no
 * props, including the no-plugin case.
 *
 * Structurally identical to `EmptyRecord`, but named separately so editor
 * hovers remain self-descriptive.
 */
export type NoPluginProps = EmptyRecord

/**
 * Determines whether an object type should be treated as empty.
 *
 * `keyof T` ignores call and construct signatures...
 */
type IsEmptyRecord<T extends object> = T extends (...args: never[]) => unknown
  ? false
  : T extends new (...args: never[]) => unknown
    ? false
    : keyof T extends never
      ? true
      : false

/**
 * Merges two object types while eliding empty operands.
 *
 * If either operand is {@link EmptyRecord}, the other operand is returned
 * directly instead of producing intersections such as
 * `Component & EmptyRecord` in editor hovers.
 *
 * Unlike a homomorphic mapped type (for example `Simplify<T>`), this preserves
 * call and construct signatures. Many component types are callable objects,
 * and mapped types silently discard those signatures.
 *
 * @remarks
 * Instantiate `MergeRecords` directly. Introducing an intermediate alias for
 * one operand (for example `type C = PolymorphicComponent<G>`) can prevent
 * `IsEmptyRecord` from evaluating eagerly, which breaks assignability under
 * `exactOptionalPropertyTypes`.
 */
export type MergeRecords<A extends object, B extends object> =
  IsEmptyRecord<A> extends true ? B : IsEmptyRecord<B> extends true ? A : A & B
