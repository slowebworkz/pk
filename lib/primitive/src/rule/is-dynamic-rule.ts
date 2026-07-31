import type { DynamicRule, Rule } from '../types'
import { isObject } from '../guards/foundational'
import { RULE_BRAND } from './rule-brand'

export function isDynamicRule<T, C>(rule: Rule<T, C>): rule is DynamicRule<T, C> {
  return isObject(rule, true) && Reflect.get(rule, RULE_BRAND) === true
}
