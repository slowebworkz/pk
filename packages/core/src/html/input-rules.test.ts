import { describe, expect, it } from 'vitest'

import type { AriaContext } from '../types'
import {
  acceptRequiresFileTypeRule,
  altRequiresImageTypeRule,
  captureRequiresFileTypeRule,
  checkedRequiresCheckableTypeRule,
  heightRequiresImageTypeRule,
  inputAccessibleNameRule,
  maxLengthRequiresTextTypeRule,
  maxRequiresNumericTypeRule,
  minLengthRequiresTextTypeRule,
  minRequiresNumericTypeRule,
  multipleRequiresSupportedTypeRule,
  passwordAutocompleteRule,
  patternRequiresTextTypeRule,
  requiredReadOnlyConflictRule,
  sizeRequiresTextTypeRule,
  stepRequiresNumericTypeRule,
  supportedInputTypeRule,
  widthRequiresImageTypeRule,
  INPUT_RULES,
} from './input-rules'

function ctx(
  props: Record<string, unknown>,
  tag = 'input',
  variantKeys: ReadonlySet<string> = new Set(),
): AriaContext {
  return {
    tag: tag as AriaContext['tag'],
    props,
    implicitRole: undefined,
    effectiveRole: undefined,
    variantKeys,
  }
}

describe('checkedRequiresCheckableTypeRule', () => {
  it('allows checked on checkbox and radio', () => {
    expect(checkedRequiresCheckableTypeRule(ctx({ type: 'checkbox', checked: true }))).toEqual([])
    expect(checkedRequiresCheckableTypeRule(ctx({ type: 'radio', checked: true }))).toEqual([])
  })

  it('flags checked on a text input (default type)', () => {
    const [result] = checkedRequiresCheckableTypeRule(ctx({ checked: true }))
    expect(result).toMatchObject({ valid: false, severity: 'warning', fixable: true })
  })

  it('is a no-op when checked is absent, or the tag is not input', () => {
    expect(checkedRequiresCheckableTypeRule(ctx({ type: 'text' }))).toEqual([])
    expect(checkedRequiresCheckableTypeRule(ctx({ checked: true }, 'select'))).toEqual([])
  })

  it('removes the attribute when the fix is applied', () => {
    const context = ctx({ type: 'text', checked: true })
    const [result] = checkedRequiresCheckableTypeRule(context)
    if (!result || result.valid || !result.fixable) throw new Error('expected a fixable violation')
    const fixResult = result.fix.apply(context)
    expect(fixResult).toMatchObject({ applied: true, next: { type: 'text' } })
  })

  it('declares readsProps for cache correctness', () => {
    expect(checkedRequiresCheckableTypeRule.readsProps).toEqual(['type', 'checked'])
  })
})

describe('multipleRequiresSupportedTypeRule', () => {
  it('allows multiple on email and file', () => {
    expect(multipleRequiresSupportedTypeRule(ctx({ type: 'email', multiple: true }))).toEqual([])
    expect(multipleRequiresSupportedTypeRule(ctx({ type: 'file', multiple: true }))).toEqual([])
  })

  it('flags multiple on an unsupported type', () => {
    const [result] = multipleRequiresSupportedTypeRule(ctx({ type: 'number', multiple: true }))
    expect(result).toMatchObject({ valid: false, severity: 'warning' })
  })
})

describe('maxLengthRequiresTextTypeRule', () => {
  it('allows maxLength on text-ish types, including the default (unset) type', () => {
    expect(maxLengthRequiresTextTypeRule(ctx({ type: 'email', maxLength: 5 }))).toEqual([])
    expect(maxLengthRequiresTextTypeRule(ctx({ maxLength: 5 }))).toEqual([])
  })

  it('flags maxLength on type="number"', () => {
    const [result] = maxLengthRequiresTextTypeRule(ctx({ type: 'number', maxLength: 5 }))
    expect(result).toMatchObject({ valid: false, severity: 'warning' })
  })
})

describe('minLengthRequiresTextTypeRule', () => {
  it('allows minLength on text-ish types', () => {
    expect(minLengthRequiresTextTypeRule(ctx({ type: 'search', minLength: 2 }))).toEqual([])
  })

  it('flags minLength on type="checkbox"', () => {
    const [result] = minLengthRequiresTextTypeRule(ctx({ type: 'checkbox', minLength: 2 }))
    expect(result).toMatchObject({ valid: false, severity: 'warning' })
  })
})

describe('patternRequiresTextTypeRule', () => {
  it('allows pattern on text-ish types', () => {
    expect(patternRequiresTextTypeRule(ctx({ type: 'tel', pattern: '[0-9]*' }))).toEqual([])
  })

  it('flags pattern on type="range"', () => {
    const [result] = patternRequiresTextTypeRule(ctx({ type: 'range', pattern: '[0-9]*' }))
    expect(result).toMatchObject({ valid: false, severity: 'warning' })
  })
})

describe('minRequiresNumericTypeRule', () => {
  it('allows min on numeric-ish types', () => {
    expect(minRequiresNumericTypeRule(ctx({ type: 'number', min: 1 }))).toEqual([])
    expect(minRequiresNumericTypeRule(ctx({ type: 'range', min: 1 }))).toEqual([])
  })

  it('flags min on the default text type', () => {
    const [result] = minRequiresNumericTypeRule(ctx({ min: 1 }))
    expect(result).toMatchObject({ valid: false, severity: 'warning' })
  })
})

describe('maxRequiresNumericTypeRule', () => {
  it('allows max on numeric-ish types', () => {
    expect(maxRequiresNumericTypeRule(ctx({ type: 'date', max: '2026-01-01' }))).toEqual([])
  })

  it('flags max on type="email"', () => {
    const [result] = maxRequiresNumericTypeRule(ctx({ type: 'email', max: 5 }))
    expect(result).toMatchObject({ valid: false, severity: 'warning' })
  })
})

describe('stepRequiresNumericTypeRule', () => {
  it('allows step on numeric-ish types', () => {
    expect(stepRequiresNumericTypeRule(ctx({ type: 'time', step: 1 }))).toEqual([])
  })

  it('flags step on type="password"', () => {
    const [result] = stepRequiresNumericTypeRule(ctx({ type: 'password', step: 1 }))
    expect(result).toMatchObject({ valid: false, severity: 'warning' })
  })
})

describe('acceptRequiresFileTypeRule', () => {
  it('allows accept on type="file"', () => {
    expect(acceptRequiresFileTypeRule(ctx({ type: 'file', accept: 'image/*' }))).toEqual([])
  })

  it('flags accept on the default text type', () => {
    const [result] = acceptRequiresFileTypeRule(ctx({ accept: 'image/*' }))
    expect(result).toMatchObject({ valid: false, severity: 'warning' })
  })
})

describe('captureRequiresFileTypeRule', () => {
  it('allows capture on type="file"', () => {
    expect(captureRequiresFileTypeRule(ctx({ type: 'file', capture: 'user' }))).toEqual([])
  })

  it('flags capture on type="email"', () => {
    const [result] = captureRequiresFileTypeRule(ctx({ type: 'email', capture: 'user' }))
    expect(result).toMatchObject({ valid: false, severity: 'warning' })
  })
})

describe('sizeRequiresTextTypeRule', () => {
  it('allows size on type="text"', () => {
    expect(sizeRequiresTextTypeRule(ctx({ type: 'text', size: 20 }))).toEqual([])
  })

  it('allows size on the default (omitted) type', () => {
    expect(sizeRequiresTextTypeRule(ctx({ size: 20 }))).toEqual([])
  })

  it('flags size on type="checkbox"', () => {
    const [result] = sizeRequiresTextTypeRule(ctx({ type: 'checkbox', size: 20 }))
    expect(result).toMatchObject({ valid: false, severity: 'warning' })
  })

  it('does not flag a "size" key that is a declared component variant (#39)', () => {
    // A `size` styling variant on a checkbox/radio contract collides in name with the HTML
    // `size` attribute but is stripped before the DOM — the "ignored for type" fact must not
    // fire for it.
    expect(
      sizeRequiresTextTypeRule(ctx({ type: 'checkbox', size: 'lg' }, 'input', new Set(['size']))),
    ).toEqual([])
  })
})

describe('altRequiresImageTypeRule', () => {
  it('allows alt on type="image"', () => {
    expect(altRequiresImageTypeRule(ctx({ type: 'image', alt: 'Submit' }))).toEqual([])
  })

  it('flags alt on the default (omitted) type', () => {
    const [result] = altRequiresImageTypeRule(ctx({ alt: 'Submit' }))
    expect(result).toMatchObject({ valid: false, severity: 'warning' })
  })
})

describe('heightRequiresImageTypeRule', () => {
  it('allows height on type="image"', () => {
    expect(heightRequiresImageTypeRule(ctx({ type: 'image', height: 40 }))).toEqual([])
  })

  it('flags height on type="checkbox"', () => {
    const [result] = heightRequiresImageTypeRule(ctx({ type: 'checkbox', height: 40 }))
    expect(result).toMatchObject({ valid: false, severity: 'warning' })
  })
})

describe('widthRequiresImageTypeRule', () => {
  it('allows width on type="image"', () => {
    expect(widthRequiresImageTypeRule(ctx({ type: 'image', width: 100 }))).toEqual([])
  })

  it('flags width on type="checkbox"', () => {
    const [result] = widthRequiresImageTypeRule(ctx({ type: 'checkbox', width: 100 }))
    expect(result).toMatchObject({ valid: false, severity: 'warning' })
  })
})

describe('supportedInputTypeRule', () => {
  it('allows every real HTML5 input type', () => {
    const realTypes = [
      'text',
      'search',
      'url',
      'tel',
      'email',
      'password',
      'number',
      'range',
      'date',
      'month',
      'week',
      'time',
      'datetime-local',
      'checkbox',
      'radio',
      'file',
      'color',
      'hidden',
      'button',
      'submit',
      'reset',
      'image',
    ]
    for (const type of realTypes) {
      expect(supportedInputTypeRule(ctx({ type }))).toEqual([])
    }
  })

  it('flags a misspelled or made-up type', () => {
    const [result] = supportedInputTypeRule(ctx({ type: 'phone' }))
    expect(result).toMatchObject({ valid: false, severity: 'warning', fixable: false })
  })

  it('is a no-op when type is absent, or the tag is not input', () => {
    expect(supportedInputTypeRule(ctx({}))).toEqual([])
    expect(supportedInputTypeRule(ctx({ type: 'phone' }, 'select'))).toEqual([])
  })
})

describe('inputAccessibleNameRule', () => {
  it('allows an input with aria-label or aria-labelledby', () => {
    expect(inputAccessibleNameRule(ctx({ 'aria-label': 'Email' }))).toEqual([])
    expect(inputAccessibleNameRule(ctx({ 'aria-labelledby': 'email-label' }))).toEqual([])
  })

  it('is a no-op for type="hidden"', () => {
    expect(inputAccessibleNameRule(ctx({ type: 'hidden' }))).toEqual([])
  })

  it('flags a placeholder-only input with the placeholder-specific message', () => {
    const [result] = inputAccessibleNameRule(ctx({ placeholder: 'Email' }))
    expect(result).toMatchObject({ valid: false, severity: 'warning' })
    expect(result && !result.valid && result.diagnostic?.message).toMatch(/placeholder/i)
  })

  it('flags an input with no name at all', () => {
    const [result] = inputAccessibleNameRule(ctx({}))
    expect(result).toMatchObject({ valid: false, severity: 'warning' })
    expect(result && !result.valid && result.diagnostic?.message).toMatch(/no accessible name/i)
  })
})

describe('passwordAutocompleteRule', () => {
  it('allows current-password and new-password', () => {
    expect(
      passwordAutocompleteRule(ctx({ type: 'password', autoComplete: 'current-password' })),
    ).toEqual([])
    expect(
      passwordAutocompleteRule(ctx({ type: 'password', autoComplete: 'new-password' })),
    ).toEqual([])
  })

  it('flags a password input with no autoComplete', () => {
    const [result] = passwordAutocompleteRule(ctx({ type: 'password' }))
    expect(result).toMatchObject({ valid: false, severity: 'warning' })
  })

  it('is a no-op for non-password types', () => {
    expect(passwordAutocompleteRule(ctx({ type: 'text' }))).toEqual([])
  })
})

describe('requiredReadOnlyConflictRule', () => {
  it('flags required + readOnly together', () => {
    const [result] = requiredReadOnlyConflictRule(ctx({ required: true, readOnly: true }))
    expect(result).toMatchObject({ valid: false, severity: 'warning', fixable: false })
  })

  it('allows required or readOnly alone', () => {
    expect(requiredReadOnlyConflictRule(ctx({ required: true }))).toEqual([])
    expect(requiredReadOnlyConflictRule(ctx({ readOnly: true }))).toEqual([])
  })
})

describe('INPUT_RULES', () => {
  it('bundles all eighteen rules', () => {
    expect(INPUT_RULES).toHaveLength(18)
  })
})
