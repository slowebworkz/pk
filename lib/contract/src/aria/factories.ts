import type { ReadonlyDeep } from 'type-fest'
import type { AnyRecord } from '@praxis-kit/primitive'
import { isDefined } from '@praxis-kit/primitive'
import type {
  AriaContext,
  AriaFix,
  AriaFixResult,
  AriaResult,
  AriaRule,
  InvalidResultInput,
  InvalidWithFix,
  InvalidWithoutFix,
  IntrinsicProps,
  RemoveAttributeRuleOptions,
} from '../types'

/**
 * Builds a correctly-literal-typed `fixable: false` `AriaResult`. Exists so a rule author can
 * extract shared branch logic (severity/attribute/message computed once, reused across multiple
 * `return`s) without TypeScript silently widening `valid: false`/`fixable: false` to `boolean`
 * the moment those values leave an object-literal-in-return-position — the widening only happens
 * on plain object literals; a function's declared return type narrows unconditionally.
 */
export function invalidWithoutFix(input: InvalidResultInput): InvalidWithoutFix {
  return {
    valid: false,
    fixable: false,
    severity: input.severity,
    ...(isDefined(input.attribute) && { attribute: input.attribute }),
    ...(isDefined(input.message) && { message: input.message }),
    ...(isDefined(input.diagnostic) && { diagnostic: input.diagnostic }),
  }
}

/** Same as {@link invalidWithoutFix}, for the `fixable: true` branch — requires a `fix`. */
export function invalidWithFix(
  input: InvalidResultInput & { readonly fix: AriaFix },
): InvalidWithFix {
  return {
    valid: false,
    fixable: true,
    severity: input.severity,
    ...(isDefined(input.attribute) && { attribute: input.attribute }),
    ...(isDefined(input.message) && { message: input.message }),
    ...(isDefined(input.diagnostic) && { diagnostic: input.diagnostic }),
    fix: input.fix,
  }
}

function removeProp(
  props: ReadonlyDeep<IntrinsicProps>,
  key: string,
): ReadonlyDeep<IntrinsicProps> {
  const next = { ...props } as AnyRecord
  delete next[key]
  return next as ReadonlyDeep<IntrinsicProps>
}

/**
 * Builds an `AriaFix` that strips a single attribute — the shape `dangerousHrefRule`-style
 * "strip this attribute when it's dangerous/redundant" rules need. A no-op (`applied: false`) when
 * the attribute isn't present, so applying the fix twice (or applying it when nothing triggered it)
 * is always safe. Frozen — a fix is a value object; nothing should mutate `kind`/`attribute`/`apply`
 * after construction.
 */
export function removeAttributeFix(attribute: string): AriaFix {
  return Object.freeze({
    kind: 'removeAttribute',
    attribute,
    apply: ({ props }: AriaContext): AriaFixResult => {
      if (!(attribute in props)) return { applied: false, next: props }
      return { applied: true, next: removeProp(props, attribute), previous: props }
    },
  })
}

// Object.defineProperties's own TS signature returns exactly T — it doesn't widen the type to
// include the newly-defined keys, unlike Object.assign (which widens but can't add non-enumerable
// properties). This wrapper gets both: a precise T & M return type, with the one unavoidable cast
// confined here instead of at each call site that needs to attach metadata to a function.
function defineRuleMetadata<
  T extends (context: AriaContext) => readonly AriaResult[],
  M extends object,
>(rule: T, metadata: M): T & M {
  const descriptors: PropertyDescriptorMap = {}
  for (const key of Object.keys(metadata)) {
    descriptors[key] = { value: (metadata as AnyRecord)[key], enumerable: false }
  }
  Object.defineProperties(rule, descriptors)
  return rule as T & M
}

/**
 * Convenience factory for the single most common `enforcement.aria`/`enforcement.rules` shape:
 * "strip this attribute when some condition on the element's own props holds" — covers
 * security-style guards (a dangerous URL scheme on `href`) and redundant-attribute rules alike,
 * without hand-writing the rule function, the `AriaFix`, and the `invalidWithFix` call each time.
 * A rule with no fix (a warn-only advisory) still needs the raw `AriaRule` shape directly — this
 * factory is deliberately scoped to the strip-on-match case, not a general rule builder.
 */
export function createRemoveAttributeRule(
  attribute: string,
  options: RemoveAttributeRuleOptions,
): AriaRule {
  const { when, severity = 'warning', message, diagnostic, readsProps, tags } = options
  const fix = removeAttributeFix(attribute)

  const rule = (context: AriaContext): readonly AriaResult[] => {
    if (!when(context)) return []
    return [
      invalidWithFix({
        severity,
        attribute,
        ...(isDefined(message) && { message }),
        ...(isDefined(diagnostic) && { diagnostic: diagnostic(context) }),
        fix,
      }),
    ]
  }

  // Non-enumerable so readsProps/tags don't leak into Object.keys(rule)/a spread of the rule —
  // they're metadata the engine reads explicitly, not part of the rule's own "value" shape.
  return defineRuleMetadata(rule, {
    ...(isDefined(readsProps) && { readsProps }),
    ...(isDefined(tags) && { tags }),
  })
}
