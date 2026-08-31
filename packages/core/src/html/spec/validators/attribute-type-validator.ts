import type { AriaContext, AriaResult, AriaRule } from '../../../types'
import { HtmlDiagnostics, removeAttributeFix } from '@praxis-kit/contract'
import type { AttributeTypePolicy } from '../types'
import type { InputAttributeName } from '../attributes/input'

const DEFAULT_INPUT_TYPE = 'text'

// Generic validator: turns an `AttributeTypePolicy` fact ("this attribute only applies to these
// input types") into a scoped, cache-friendly `AriaRule`, so adding a new policy entry never
// requires writing another predicate.
export function createInputAttributeTypeRule({
  attribute,
  allowedTypes,
}: AttributeTypePolicy<InputAttributeName>): AriaRule {
  const rule = ({ tag, props, variantKeys }: AriaContext): readonly AriaResult[] => {
    if (tag !== 'input' || !(attribute in props)) return []
    // A variant prop that happens to share this attribute's name (e.g. a styling-only
    // `size` on a checkbox contract) is intercepted before the DOM — it never renders as
    // the HTML attribute, so the "ignored for type" fact doesn't apply. See
    // PRAXIS-KIT-FINDINGS.md #39.
    if (variantKeys?.has(attribute)) return []
    const type = typeof props.type === 'string' ? props.type : DEFAULT_INPUT_TYPE
    if (allowedTypes.includes(type)) return []
    const diagnostic = HtmlDiagnostics.input.attributeIgnoredForType(attribute, type, allowedTypes)
    return [
      {
        valid: false,
        fixable: true,
        severity: diagnostic.severity,
        fix: removeAttributeFix(attribute),
        diagnostic,
      },
    ]
  }
  return Object.assign(rule, { readsProps: ['type', attribute] as const, tags: ['input'] as const })
}
