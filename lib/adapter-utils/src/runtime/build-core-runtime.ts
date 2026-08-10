import type {
  DefaultOf,
  FactoryOptions,
  PolymorphicGenerics,
  RecipeOf,
  PropsOf,
  VariantsOf,
} from '@praxis-kit/core'
import { createPolymorphic } from '@praxis-kit/core'

const EMPTY_SET: ReadonlySet<string> = new Set()

export function buildCoreRuntime<G extends PolymorphicGenerics>(
  normalized: FactoryOptions<DefaultOf<G>, PropsOf<G>, VariantsOf<G>, RecipeOf<G>>,
) {
  const runtime = createPolymorphic(normalized)
  // classPlugin is absent when no styling plugin is provided; fall back to EMPTY_SET
  // so consumers can call ownedKeys.has(key) unconditionally.
  const ownedKeys: ReadonlySet<string> =
    'classPlugin' in runtime ? (runtime.classPlugin.ownedKeys ?? EMPTY_SET) : EMPTY_SET
  return { runtime, ownedKeys }
}
