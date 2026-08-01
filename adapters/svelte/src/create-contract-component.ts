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
import { assembleCompoundComponent } from '@praxis-kit/adapter-utils'
import { buildRuntime } from './build-runtime'
import type { SvelteFactoryOptions } from './svelte-options'
import type { BuiltRuntime, WithChildRules } from './types/built-runtime'
import type { UnknownProps } from './types'

/**
 * Creates a praxis-kit contract bundle for use with Svelte's `<Polymorphic>` component.
 *
 * Unlike the other adapters, this returns a plain bundle object rather than a component —
 * Svelte components must come from `.svelte` files, a compile-time constraint — so the bundle
 * is passed as the `bundle` prop:
 *
 * ```ts
 * // button.ts
 * export const buttonBundle = createContractComponent({
 *   tag: 'button',
 *   name: 'Button',
 *   styling: {
 *     base: 'btn',
 *     variants: { intent: { primary: 'btn--primary', ghost: 'btn--ghost' } },
 *     defaults: { intent: 'primary' },
 *   },
 * })
 * ```
 *
 * ```svelte
 * <!-- Button.svelte -->
 * <script lang="ts">
 *   import Polymorphic from 'praxis-kit/svelte/Polymorphic.svelte'
 *   import { buttonBundle } from './button'
 * </script>
 * <Polymorphic bundle={buttonBundle} intent="ghost" as="a" href="/home">Home</Polymorphic>
 * ```
 *
 * Pass `subComponents` to attach named sub-components (`Card.Header`) — `Object.assign` works
 * the same way on a plain bundle as on a component function/class, so `Card.Header` is itself
 * just another bundle, passed to its own `<Polymorphic bundle={Card.Header}>`. Pass `onElement`
 * to run setup once the real DOM element exists.
 */
export function createContractComponent<
  TDefault extends ElementType,
  Props extends UnknownProps = EmptyRecord,
  Variants extends Readonly<VariantMap> = Readonly<EmptyRecord>,
  TPreset extends RecipeMap<Variants> = Readonly<EmptyRecord>,
  TPlugin extends AnyClassPluginFactory = AnyClassPluginFactory,
  TSubComponents extends Readonly<AnyRecord> = EmptyRecord,
  TOptions extends WithChildRules = SvelteFactoryOptions<
    TDefault,
    Props & ExtractPluginProps<TPlugin>,
    Variants,
    TPreset
  >,
>(
  options: SvelteFactoryOptions<TDefault, Props, Variants, TPreset, TPlugin> &
    TOptions & { readonly subComponents?: TSubComponents },
): BuiltRuntime<
  PolymorphicGenerics<TDefault, Props & ExtractPluginProps<TPlugin>, Variants, TPreset>,
  TOptions
> &
  TSubComponents {
  const bundle = buildRuntime(
    options as SvelteFactoryOptions<TDefault, Props, Variants, TPreset> & TOptions,
  ) as unknown as BuiltRuntime<
    PolymorphicGenerics<TDefault, Props & ExtractPluginProps<TPlugin>, Variants, TPreset>,
    TOptions
  >

  return assembleCompoundComponent(bundle, options.subComponents)
}
