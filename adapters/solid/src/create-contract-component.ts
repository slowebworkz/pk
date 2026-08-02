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
import { mergeProps, onCleanup } from 'solid-js'
import { applyDisplayName } from './apply-display-name'
import { buildRuntime } from './build-runtime'
import { isPolymorphicComponent } from './is-polymorphic-component'
import { render } from './render'
import { isSolidFactoryOptions } from './to-solid-factory-options'
import type { SolidFactoryOptions } from './solid-options'
import type { KnownProps, PolymorphicComponent, SolidElement, UnknownProps } from './types'

/**
 * Creates a polymorphic Solid component with praxis-kit contracts applied.
 *
 * ```tsx
 * const Button = createContractComponent({
 *   tag: 'button',
 *   name: 'Button',
 *   styling: {
 *     base: 'btn',
 *     variants: { intent: { primary: 'btn--primary', ghost: 'btn--ghost' } },
 *     defaults: { intent: 'primary' },
 *   },
 * })
 *
 * <Button intent="ghost" as="a" href="/home">Home</Button>
 * ```
 *
 * `ref` is forwarded as an ordinary Solid ref callback. Pass `subComponents` to attach named
 * sub-components (`Card.Header`) and `onElement` to run setup once the real DOM element exists.
 */
export function createContractComponent<
  TDefault extends ElementType,
  Props extends UnknownProps = EmptyRecord,
  Variants extends Readonly<VariantMap> = Readonly<EmptyRecord>,
  TPreset extends RecipeMap<Variants> = Readonly<EmptyRecord>,
  TPlugin extends AnyClassPluginFactory = AnyClassPluginFactory,
  TSubComponents extends Readonly<AnyRecord> = EmptyRecord,
>(
  options: SolidFactoryOptions<TDefault, Props, Variants, TPreset, TPlugin> & {
    readonly subComponents?: TSubComponents
  },
): PolymorphicComponent<
  PolymorphicGenerics<TDefault, Props & ExtractPluginProps<TPlugin>, Variants, TPreset>
> &
  TSubComponents {
  invariant(isSolidFactoryOptions(options), 'options is not a valid SolidFactoryOptions object')
  // This adapter's buildRuntime can't accept `options` as-is: its signature is
  // `SolidFactoryOptions<TDefault, Props, Variants, TPreset> & TOptions`,
  // defaulting TPlugin itself and inferring a fresh TOptions — a specific
  // TPlugin instantiation isn't assignable to that default under
  // exactOptionalPropertyTypes (a known, separately-tracked plugin/styling
  // generic invariance; see the NormalizeFn bivariance note elsewhere in this
  // codebase). TPlugin is erased at runtime regardless, so no guard could
  // ever check this gap — it needs an assertion the same way buildRuntime's
  // TPlugin elision does in every other adapter.
  const bundle = buildRuntime(options as SolidFactoryOptions<TDefault, Props, Variants, TPreset>)
  const { onElement } = options

  const Component = (props: UnknownProps): SolidElement => {
    // Solid ref callbacks fire once, at element creation — a natural fit for "mount". They
    // don't fire again with null on unmount (unlike React), so cleanup is registered via
    // Solid's own onCleanup instead of a second ref invocation.
    const propsWithRef = onElement
      ? mergeProps(props, {
          get ref() {
            const consumerRef = (props as { ref?: unknown }).ref
            return (el: Element) => {
              if (typeof consumerRef === 'function') (consumerRef as (e: Element) => void)(el)
              const cleanup = onElement(el, () => props as unknown as Readonly<Props>)
              if (cleanup) onCleanup(cleanup)
            }
          },
        })
      : props

    return render({
      ...bundle,
      props: propsWithRef as KnownProps,
    })
  }

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
