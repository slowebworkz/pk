import { isFunction, isObject, isString } from '@praxis-kit/primitive'

/**
 * Loosely validates one recognized `FactoryOptions` field's runtime shape.
 * "Loosely" because the field's declared type is itself parameterized by a
 * generic (Props, Variants, TPlugin, ...) that's erased at runtime — these
 * checks confirm the field is the right *kind* of value (object, function,
 * string), not that it satisfies its exact generic instantiation, which no
 * runtime check can ever do.
 *
 * Covers every field `FactoryOptions` itself declares — identical across
 * every adapter, since they all extend the same core type. Adapter-specific
 * additions (React's `slotComponent`/`artifact`, every adapter's own
 * `filterProps`, etc.) are passed in by the caller as extra entries.
 */
export const FACTORY_OPTIONS_FIELD_VALIDATORS: Record<string, (value: unknown) => boolean> = {
  tag: (v) => v === undefined || isString(v),
  name: (v) => v === undefined || isString(v),
  defaults: (v) => v === undefined || isObject(v),
  normalize: (v) => v === undefined || isFunction(v),
  styling: (v) => v === undefined || isObject(v),
  enforcement: (v) => v === undefined || isObject(v),
  diagnostics: (v) => v === undefined || isObject(v),
  subComponents: (v) => v === undefined || isObject(v),
}

/**
 * Type guard narrowing the generic `FactoryOptions` shape down to an
 * adapter-specific factory options type `T` — the type each adapter's
 * `buildRuntime` is declared against.
 *
 * Walks every own enumerable property on `options` and checks it against
 * `FACTORY_OPTIONS_FIELD_VALIDATORS` plus `extraFieldValidators` (the
 * adapter's own additions on top of `FactoryOptions`): an unrecognized key,
 * or a recognized key holding a value of the wrong kind, fails the guard.
 * This is a genuine structural check, not a relabeled assertion — though it
 * necessarily stops at each field's runtime *kind*, since the field's actual
 * generic instantiation is erased at runtime and no guard can validate it.
 * That part remains the caller's responsibility, same as with any other
 * generic function in TypeScript.
 */
export function isFactoryOptionsLike<T>(
  options: unknown,
  extraFieldValidators: Record<string, (value: unknown) => boolean>,
): options is T {
  if (!isObject(options)) return false

  const validators = { ...FACTORY_OPTIONS_FIELD_VALIDATORS, ...extraFieldValidators }

  for (const [key, value] of Object.entries(options)) {
    const validate = validators[key]
    if (!validate || !validate(value)) return false
  }

  return true
}
