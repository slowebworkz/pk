import type {
  AnyClassPluginFactory,
  AnyRecord,
  ElementType,
  EmptyRecord,
  ExtractPluginProps,
  PolymorphicGenerics,
  RecipeMap,
  VariantMap,
} from '@praxis-kit/core'
import { finalizeComponent, invariant } from '@praxis-kit/adapter-utils'
import type { Ref } from 'react'
import type { PolymorphicComponent, ReactFactoryOptions, UnknownProps } from '../shared'
import { applyDisplayName, isPolymorphicComponent, isReactFactoryOptions, render } from '../shared'
import { buildRuntime } from './build-runtime'

export function createContractComponent<
  TDefault extends ElementType,
  Props extends UnknownProps = EmptyRecord,
  Variants extends Readonly<VariantMap> = Readonly<EmptyRecord>,
  TPreset extends RecipeMap<Variants> = Readonly<EmptyRecord>,
  TPlugin extends AnyClassPluginFactory = AnyClassPluginFactory,
  TAllowed extends ElementType = ElementType,
  TSubComponents extends Readonly<AnyRecord> = EmptyRecord,
>(
  options: ReactFactoryOptions<TDefault, Props, Variants, TPreset, TPlugin, TAllowed> & {
    readonly subComponents?: TSubComponents
  },
): PolymorphicComponent<
  PolymorphicGenerics<TDefault, Props & ExtractPluginProps<TPlugin>, Variants, TPreset, TAllowed>
> &
  TSubComponents {
  invariant(isReactFactoryOptions(options), 'options is not a valid ReactFactoryOptions object')
  const bundle = buildRuntime(options)

  function Component({ ref, ...props }: UnknownProps & { ref?: Ref<unknown> }) {
    return render({ ...bundle, props, ref: ref ?? null })
  }

  applyDisplayName(Component, options.name)
  const assembled = finalizeComponent(
    Component,
    bundle.runtime.options.defaultTag,
    options.subComponents,
  )

  type G = PolymorphicGenerics<
    TDefault,
    Props & ExtractPluginProps<TPlugin>,
    Variants,
    TPreset,
    TAllowed
  >
  invariant(
    isPolymorphicComponent<G>(assembled),
    'Generated component failed to satisfy the PolymorphicComponent shape',
  )

  return assembled
}
