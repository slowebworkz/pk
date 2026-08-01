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
import { finalizeComponent, invariant, resolveSubComponentOptions } from '@praxis-kit/adapter-utils'
import { forwardRef } from 'preact/compat'
import type { ForwardedRef } from 'preact/compat'
import { applyDisplayName } from './apply-display-name'
import { render } from './render'
import { buildRuntime } from './build-runtime'
import { isPolymorphicComponent } from './is-polymorphic-component'
import { isPreactFactoryOptions } from './to-preact-factory-options'
import type { AnyVNode, PolymorphicComponent, UnknownProps } from './types'
import type { PreactFactoryOptions } from './preact-options'

export function createContractComponent<
  TDefault extends ElementType,
  Props extends UnknownProps = EmptyRecord,
  Variants extends Readonly<VariantMap> = Readonly<EmptyRecord>,
  TPreset extends RecipeMap<Variants> = Readonly<EmptyRecord>,
  TPlugin extends AnyClassPluginFactory = AnyClassPluginFactory,
  TSubComponents extends Readonly<AnyRecord> = EmptyRecord,
>(
  options: PreactFactoryOptions<TDefault, Props, Variants, TPreset, TPlugin> & {
    readonly subComponents?: TSubComponents
  },
): PolymorphicComponent<
  PolymorphicGenerics<TDefault, Props & ExtractPluginProps<TPlugin>, Variants, TPreset>
> &
  TSubComponents {
  const runtimeOptions = resolveSubComponentOptions(options)
  invariant(
    isPreactFactoryOptions(runtimeOptions),
    'resolveSubComponentOptions returned a non-object options value',
  )
  const bundle = buildRuntime(runtimeOptions)

  const Component = forwardRef(function Component(
    props: UnknownProps,
    ref: ForwardedRef<unknown>,
  ): AnyVNode {
    return render({ ...bundle, props, ref: ref ?? null })
  })

  applyDisplayName(Component, options.name)
  const assembled = finalizeComponent(
    Component,
    bundle.runtime.options.defaultTag,
    options.subComponents,
  )

  type G = PolymorphicGenerics<TDefault, Props & ExtractPluginProps<TPlugin>, Variants, TPreset>
  invariant(
    isPolymorphicComponent<G>(assembled),
    'Generated component failed to satisfy the PolymorphicComponent shape',
  )

  return assembled
}
