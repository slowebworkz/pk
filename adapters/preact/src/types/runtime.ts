import type {
  ClassName,
  DefaultOf,
  ElementType,
  IntrinsicProps,
  PolymorphicGenerics,
  PropsOf,
  RecipeOf,
  ResolvedFactoryOptions,
  VariantsOf,
  createPolymorphic,
} from '@praxis-kit/core'
import type { ResolvedProps, UnknownProps } from './primitives'

/**
 * Factory configuration retained by the runtime after component creation.
 */
export type RuntimeOptions = Readonly<
  Pick<
    ResolvedFactoryOptions,
    | 'defaultTag'
    | 'displayName'
    | 'diagnostics'
    | 'variantKeys'
    | 'childRules'
    | 'allowedAs'
    | 'normalizeFn'
    | 'htmlPropNormalizersFn'
    | 'htmlChildrenEvaluatorFn'
  >
>

/**
 * Resolves the element or component to render.
 */
export type TagResolver = Readonly<{
  resolveTag(as?: ElementType): ElementType
}>

/**
 * Produces normalized props for the render pipeline.
 */
export type PropsResolver = Readonly<{
  resolveProps(props: UnknownProps): ResolvedProps
}>

/**
 * Resolves the final className for the rendered element.
 */
export type ClassResolver = Readonly<{
  resolveClasses(
    tag: ElementType,
    props: ResolvedProps,
    className?: ClassName,
    recipe?: string,
  ): string | undefined
}>

/**
 * Applies runtime ARIA normalization.
 */
export type AriaResolver = Readonly<{
  resolveAria<P extends IntrinsicProps>(tag: ElementType, props: P): { props: P }
}>

/**
 * Rendering behaviors supplied by the runtime.
 *
 * Each resolver owns one stage of the render pipeline.
 */
export type RuntimeServices = Readonly<TagResolver & PropsResolver & ClassResolver & AriaResolver>

/**
 * Runtime configuration available during rendering.
 */
export type RuntimeConfiguration = Readonly<{
  options: RuntimeOptions
}>

/**
 * Runtime implementation used during a render pass.
 *
 * Combines rendering services with the configuration produced by the
 * component factory.
 */
export type Runtime = Readonly<RuntimeServices & RuntimeConfiguration>

/**
 * Strongly typed runtime returned by createPolymorphic().
 */
export type TypedRuntime<G extends PolymorphicGenerics> = ReturnType<
  typeof createPolymorphic<DefaultOf<G>, PropsOf<G>, VariantsOf<G>, RecipeOf<G>>
>
