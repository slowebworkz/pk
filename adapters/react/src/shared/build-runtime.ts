import type {
  AllowedOf,
  AnyClassPluginFactory,
  DefaultOf,
  ElementType,
  PolymorphicGenerics,
  RecipeMap,
  RecipeOf,
  PropsOf,
  VariantMap,
  VariantsOf,
} from '@praxis-kit/core'
import {
  buildCoreRuntime,
  buildEngines,
  composeFilter,
  resolveAdapterCommonOptions,
} from '@praxis-kit/adapter-utils'
import type { ReactFactoryOptions } from './react-options'
import type {
  BuiltRuntime,
  NormalizedOptions,
  NormalizeChildren,
  SlotComponent,
  UnknownProps,
} from './types'
import { SlotValidator } from './slot'

function normalizeOptions<G extends PolymorphicGenerics>(
  options: ReactFactoryOptions<
    DefaultOf<G>,
    PropsOf<G>,
    VariantsOf<G>,
    RecipeOf<G>,
    AnyClassPluginFactory,
    AllowedOf<G>
  >,
  defaultSlotComponent: SlotComponent,
): NormalizedOptions<G> {
  return {
    ...options,
    ...resolveAdapterCommonOptions(options),
    slotComponent: options.slotComponent ?? defaultSlotComponent,
  } as NormalizedOptions<G>
}

export type { BuiltRuntime }

/**
 * Shared by `current/build-runtime.ts` and `legacy/build-runtime.ts` — the two variants differ
 * only in which `Slot` component and `normalizeChildren` implementation they wire in (React
 * 19's plain-prop ref vs. React 18's `forwardRef`, and Fragment-handling differences between
 * the two `normalize-children.ts` copies).
 */
export function buildRuntime<
  TDefault extends ElementType,
  Props extends UnknownProps,
  Variants extends Readonly<VariantMap>,
  TPreset extends RecipeMap<Variants>,
  TAllowed extends ElementType = ElementType,
>(
  options: ReactFactoryOptions<TDefault, Props, Variants, TPreset, AnyClassPluginFactory, TAllowed>,
  defaultSlotComponent: SlotComponent,
  normalizeChildren: NormalizeChildren,
): BuiltRuntime<PolymorphicGenerics<TDefault, Props, Variants, TPreset, TAllowed>> {
  type G = PolymorphicGenerics<TDefault, Props, Variants, TPreset, TAllowed>
  const normalized = normalizeOptions<G>(options, defaultSlotComponent)
  const { runtime, ownedKeys } = buildCoreRuntime<G>(normalized)
  const { childrenEvaluator } = buildEngines(
    normalized.diagnostics,
    normalized.enforcement?.children,
    normalized.name,
    {
      exclusiveChildren: normalized.enforcement?.exclusiveChildren,
      allowText: normalized.enforcement?.allowText,
    },
  )
  const filterProps = composeFilter(ownedKeys, normalized.filterProps)
  const slotValidator = new SlotValidator(normalized.name, normalized.diagnostics, 'React element')

  return {
    runtime,
    filterProps,
    slotValidator,
    slotComponent: normalized.slotComponent,
    normalizeChildren,
    ...(childrenEvaluator !== undefined && { childrenEvaluator }),
  } as BuiltRuntime<G>
}
