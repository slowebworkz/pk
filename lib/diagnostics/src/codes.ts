// Ranges:
// 1000–1999  Component composition & contracts
// 2000–2999  ARIA
// 3000–3999  HTML semantics (3000–3099 general, 3100–3199 <input>, later element
//            families get their own reserved block — e.g. 3200 <button>, 3300 <img>)
// 4000–4999  Rendering
// 5000–5999  Static linting
// 6000–6999  CSS / Tailwind
// 7000–7999  Plugin API
// 8000–8999  Accessibility guidance (best practice, not spec validity)
// 9000–9999  Internal
export enum DiagnosticCode {
  // Composition / children
  MissingRequiredChild = 'COMP1001',
  InvalidParent = 'COMP1002',
  InvalidChild = 'COMP1003',
  UnexpectedChild = 'COMP1004',
  AmbiguousChild = 'COMP1005',
  CardinalityMin = 'COMP1006',
  CardinalityMax = 'COMP1007',
  PositionViolation = 'COMP1008',
  AllowedAsViolation = 'COMP1009',

  // Slot protocol
  SlotExclusive = 'SLOT1001',
  SlotSingleChild = 'SLOT1002',
  SlotDiscardedChildren = 'SLOT1003',
  SlotRenderFn = 'SLOT1004',

  // ARIA
  MissingAriaRelationship = 'ARIA2001',
  AriaViolation = 'ARIA2002',
  AriaAttributeInvalid = 'ARIA2003',
  AriaMissingLiveRegion = 'ARIA2004',
  AriaMissingAtomic = 'ARIA2005',
  AriaRelevantInvalidToken = 'ARIA2006',
  AriaRelevantSuperseded = 'ARIA2007',
  AriaInvalidRole = 'ARIA2008',
  AriaMissingAccessibleName = 'ARIA2009',
  AriaAttributeOnPresentational = 'ARIA2010',
  AriaHiddenOnFocusable = 'ARIA2011',
  AriaRequiredProperty = 'ARIA2012',
  AriaInvalidAttributeValue = 'ARIA2013',
  AriaRedundantLevelAttribute = 'ARIA2014',

  // HTML — general (3000–3099)
  InvalidHeadingHierarchy = 'HTML3001',
  HtmlEmptyRole = 'HTML3002',
  HtmlImplicitRoleRedundant = 'HTML3003',
  HtmlImplicitRoleOverride = 'HTML3004',
  HtmlStandaloneRegionOverride = 'HTML3005',
  HtmlLandmarkRoleOverride = 'HTML3006',
  HtmlInvalidChild = 'HTML3007',
  HtmlRoleNotPermitted = 'HTML3008',

  // HTML — <input> (3100–3199)
  HtmlInputUnsupportedType = 'HTML3101',
  HtmlInputCheckedIgnoredForType = 'HTML3102',
  HtmlInputMultipleIgnoredForType = 'HTML3103',
  HtmlInputMaxLengthIgnoredForType = 'HTML3104',
  HtmlInputMinLengthIgnoredForType = 'HTML3105',
  HtmlInputPatternIgnoredForType = 'HTML3106',
  HtmlInputMinIgnoredForType = 'HTML3107',
  HtmlInputMaxIgnoredForType = 'HTML3108',
  HtmlInputStepIgnoredForType = 'HTML3109',
  HtmlInputAcceptIgnoredForType = 'HTML3110',
  HtmlInputCaptureIgnoredForType = 'HTML3111',
  HtmlInputSizeIgnoredForType = 'HTML3112',
  HtmlInputAltIgnoredForType = 'HTML3113',
  HtmlInputHeightIgnoredForType = 'HTML3114',
  HtmlInputWidthIgnoredForType = 'HTML3115',

  // HTML — <a> (3200–3299)
  HtmlAnchorDangerousHref = 'HTML3201',

  // Accessibility (best-practice advisories, not HTML/ARIA validity facts)
  A11yInputMissingAccessibleName = 'A11Y8100',
  A11yInputPlaceholderNotLabel = 'A11Y8101',
  A11yInputPasswordAutocomplete = 'A11Y8102',
  A11yInputRequiredReadOnlyConflict = 'A11Y8103',
  A11yAnchorRoleButtonWithHref = 'A11Y8200',
  A11yAnchorAriaDisabledInert = 'A11Y8201',

  // Rendering
  InvalidRenderingTarget = 'RENDER4001',

  // Lint (static analysis only — no runtime counterpart)
  LintDeadCompoundKey = 'LINT5001',
  LintDeadCompoundValue = 'LINT5002',
  LintDeadCompoundNonLiteral = 'LINT5003',
  LintMissingStrict = 'LINT5004',
  LintInvalidDefaultKey = 'LINT5005',
  LintInvalidDefaultValue = 'LINT5006',
  LintInvalidDefaultNonLiteral = 'LINT5007',
  LintNegativeMin = 'LINT5008',
  LintNegativeMax = 'LINT5009',
  LintMaxLessThanMin = 'LINT5010',
  LintZeroMax = 'LINT5011',
  LintMultipleFirst = 'LINT5012',
  LintMultipleLast = 'LINT5013',
  LintMinSumExceedsCapacity = 'LINT5014',
  LintCardinalityViolation = 'LINT5015',
  LintAriaTagOverride = 'LINT5016',

  // Contract — configuration violations (factory-time and render-time)
  ContractUnknownVariantDim = 'COMP1010',
  ContractUnknownVariantValue = 'COMP1011',
  ContractUnknownRecipeKey = 'COMP1012',
  ContractInvalidVariantValue = 'COMP1013',

  // Tailwind / CSS pipeline
  TailwindMultipleDisplayProps = 'CSS6001',
  TailwindReservedLayoutLiteral = 'CSS6002',
  TailwindDeadVariantClass = 'CSS6003',
  TailwindLayoutOnVoidTag = 'CSS6004',

  // Plugin API contract violations (developer-facing, not user-facing)
  PluginInvalidShape = 'PLUGIN7001',
  PluginPipelineReturnType = 'PLUGIN7002',

  // Internal
  InternalError = 'INTERNAL9000',
}
