import type {
  AnyClassPluginFactory,
  ElementType,
  EmptyRecord,
  ExtractPluginProps,
  PolymorphicGenerics,
  RecipeMap,
  VariantMap,
} from '@praxis-kit/core'
import { COMPONENT_DEFAULT_TAG } from '@praxis-kit/primitive'
import { assembleCompoundComponent, resolveSubComponentOptions } from '@praxis-kit/adapter-utils'
import type { Ref } from 'react'
import type { PolymorphicComponent, ReactFactoryOptions, UnknownProps } from '../shared'
import { applyDisplayName, render } from '../shared'
import { buildRuntime } from './build-runtime'

export function createContractComponent<
  TDefault extends ElementType,
  Props extends UnknownProps = EmptyRecord,
  Variants extends Readonly<VariantMap> = Readonly<EmptyRecord>,
  TPreset extends RecipeMap<Variants> = Readonly<EmptyRecord>,
  TPlugin extends AnyClassPluginFactory = AnyClassPluginFactory,
  TAllowed extends ElementType = ElementType,
  TSubComponents extends Readonly<Record<string, unknown>> = EmptyRecord,
>(
  options: ReactFactoryOptions<TDefault, Props, Variants, TPreset, TPlugin, TAllowed> & {
    readonly subComponents?: TSubComponents
  },
) {
  const runtimeOptions = resolveSubComponentOptions(options)
  const bundle = buildRuntime(
    runtimeOptions as ReactFactoryOptions<TDefault, Props, Variants, TPreset>,
  )

  function Component({ ref, ...props }: UnknownProps & { ref?: Ref<unknown> }) {
    return render({ ...bundle, props, ref: ref ?? null })
  }

  applyDisplayName(Component, options.name)
  const defaultTag = bundle.runtime.options.defaultTag
  if (typeof defaultTag === 'string') {
    Object.assign(Component, { [COMPONENT_DEFAULT_TAG]: defaultTag })
  }

  const assembled = assembleCompoundComponent(Component, options.subComponents)

  return assembled as unknown as PolymorphicComponent<
    PolymorphicGenerics<TDefault, Props & ExtractPluginProps<TPlugin>, Variants, TPreset, TAllowed>
  > &
    TSubComponents
}
