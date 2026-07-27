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
  const rule = ({ tag, props }: AriaContext): readonly AriaResult[] => {
    if (tag !== 'input' || !(attribute in props)) return []
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
