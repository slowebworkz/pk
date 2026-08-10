import type {
  ClassName,
  DefaultOf,
  ElementType,
  IntrinsicProps,
  PolymorphicGenerics,
  RecipeOf,
  PropsOf,
  ResolvedFactoryOptions,
  VariantsOf,
  createPolymorphic,
} from '@praxis-kit/core'
import type { ResolvedProps, UnknownProps } from './primitives'

export type RuntimeOptions = Readonly<
  Pick<
    ResolvedFactoryOptions,
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

export type TagResolver = Readonly<{
  resolveTag(as?: ElementType): ElementType
}>

export type PropsResolver = Readonly<{
  resolveProps(props: UnknownProps): ResolvedProps
}>

export type ClassResolver = Readonly<{
  resolveClasses(
    tag: ElementType,
    props: ResolvedProps,
    className?: ClassName,
    recipe?: string,
  ): string | undefined
}>

export type AriaResolver = Readonly<{
  resolveAria<P extends IntrinsicProps>(tag: ElementType, props: P): { props: P }
}>

export type Runtime = Readonly<
  TagResolver &
    PropsResolver &
    ClassResolver &
    AriaResolver & {
      options: RuntimeOptions
    }
>

export type TypedRuntime<G extends PolymorphicGenerics> = ReturnType<
  typeof createPolymorphic<DefaultOf<G>, PropsOf<G>, VariantsOf<G>, RecipeOf<G>>
>
