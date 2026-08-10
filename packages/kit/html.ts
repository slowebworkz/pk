// Public surface for praxis-kit's built-in HTML/ARIA rule library — the per-tag facts
// (attribute-type constraints, redundant-role advisories, accessible-name checks) that are
// already merged automatically into every component's `enforcement.aria` pipeline via
// HTML_ARIA_RULES (see createPolymorphic's ariaRules resolution). Nothing here changes what
// runs by default — these rules fire whether or not a consumer ever imports this subpath.
//
// Exported so a consumer can reference a specific built-in rule by name (for their own tests or
// docs), compose an `enforcement.aria` array that builds on top of one, or discover the full
// active set without reading praxis-kit's own source.
export {
  HTML_ARIA_RULES,
  landmarkRoleRule,
  landmarkAccessibleNameRule,
  requireAccessibleName,
  roleNotPermittedRule,
  INPUT_RULES,
  supportedInputTypeRule,
  checkedRequiresCheckableTypeRule,
  multipleRequiresSupportedTypeRule,
  maxLengthRequiresTextTypeRule,
  minLengthRequiresTextTypeRule,
  patternRequiresTextTypeRule,
  minRequiresNumericTypeRule,
  maxRequiresNumericTypeRule,
  stepRequiresNumericTypeRule,
  acceptRequiresFileTypeRule,
  captureRequiresFileTypeRule,
  sizeRequiresTextTypeRule,
  altRequiresImageTypeRule,
  heightRequiresImageTypeRule,
  widthRequiresImageTypeRule,
  inputAccessibleNameRule,
  passwordAutocompleteRule,
  requiredReadOnlyConflictRule,
  ANCHOR_RULES,
  dangerousHrefRule,
  roleButtonWithHrefRule,
  ariaDisabledInertRule,
} from '@praxis-kit/core'
