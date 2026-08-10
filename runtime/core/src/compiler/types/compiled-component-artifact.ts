import type { CapabilityMap, Diagnostic, SlotName, VariantMap } from '@praxis-kit/pipeline'
import type { StringMap } from '@praxis-kit/primitive'
import type { ComponentDefinition } from '../../types'

export interface SourceLocation {
  file: string
  line: number
  column: number
}

export interface ArtifactMetadata {
  slots?: readonly SlotName[]
  variants?: VariantMap
  capabilities: CapabilityMap
  diagnostics: readonly Diagnostic[]
  source?: SourceLocation
}

export interface ArtifactHashes {
  topology: string
  styling: string
}

/**
 * The output of the build-time compiler pass.
 *
 * `definition` is the runtime-usable piece — the only field `createCompiledComponent`
 * needs. Everything else is for tooling: IDE plugins, docs generators, Storybook
 * adapters, and incremental rebuild caches.
 *
 * `version` guards against loading artifacts produced by an incompatible compiler.
 * The runtime should reject artifacts whose version does not match its own.
 */
export interface ArtifactPrecomputed {
  /** Variant + compound class string keyed by `buildPrecomputedKey(activeProps)`. */
  readonly variantLookup: StringMap<string>
}

export interface CompiledComponentArtifact {
  readonly version: 1
  readonly definition: ComponentDefinition
  readonly metadata: ArtifactMetadata
  readonly hashes: ArtifactHashes
  readonly precomputed?: ArtifactPrecomputed
}
