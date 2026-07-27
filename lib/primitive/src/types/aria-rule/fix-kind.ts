// Previously template-literal types (`removeAttribute:${string}`) that encoded the target
// attribute inside `kind` itself, forcing consumers to parse the string back apart to read it.
// The attribute now lives on `AriaFix.attribute` as a real field — these stay as named,
// bare-string kinds instead of inlining 'removeAttribute'/'injectLive' directly into `FixKind`,
// so the exported type name (part of the public `praxis-kit/contract` surface) doesn't change.
export type RemoveAttributeFixKind = 'removeAttribute'
export type InjectLiveFixKind = 'injectLive'
export type FixKind =
  'removeRole' | 'setRole' | 'normalizeRelevantAll' | RemoveAttributeFixKind | InjectLiveFixKind
