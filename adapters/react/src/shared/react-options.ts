import type {
  AnyClassPluginFactory,
  ElementType as CoreElementType,
  FactoryOptions,
  NoPreset,
  RecipeMap,
  VariantMap,
} from '@praxis-kit/core'
import type { ComponentDefinition } from '@praxis-kit/runtime'
import type { UnknownProps, SlotComponent } from './types'

/** Structural subset of `CompiledComponentArtifact` consumed by the React adapter. */
export interface CompiledArtifact {
  readonly definition: ComponentDefinition
  readonly precomputed?: {
    readonly variantLookup?: Record<string, string>
  }
}

/**
 * Extends FactoryOptions with React-specific configuration.
 * slotComponent is intentionally not in core — it is a React rendering concern.
 */
export type ReactFactoryOptions<
  TDefault extends CoreElementType,
  Props extends UnknownProps,
  Variants extends Readonly<VariantMap>,
  TPreset extends RecipeMap<Variants> = NoPreset,
  TPlugin extends AnyClassPluginFactory = AnyClassPluginFactory,
  TAllowed extends CoreElementType = CoreElementType,
> = FactoryOptions<TDefault, Props, Variants, TPreset, TPlugin, TAllowed> & {
  /** Component used to render the asChild slot. Defaults to the built-in Slot. */
  slotComponent?: SlotComponent
  /**
   * Return true for any prop key that should be consumed but not forwarded to the DOM.
   * The adapter strips nothing by default — implementations decide what is safe to drop.
   * Receives `runtime.options.variantKeys` as a convenience if needed.
   */
  filterProps?: (key: string, variantKeys: ReadonlySet<string>) => boolean
  /** Pre-compiled artifact from `@praxis-kit/runtime`'s compiler. When provided, replaces the stub
   *  definition and enables the precomputed variant lookup fast path. */
  artifact?: CompiledArtifact
}
