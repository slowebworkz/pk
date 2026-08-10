import type { AnyRecord, ClassPipelineOptions, VariantConditionValue, VariantMap } from './types'
import { cva } from './cva'
import { cn, iterate } from '@praxis-kit/primitive'
import type { StringMap } from '@praxis-kit/primitive'

export type CompoundTrace = {
  conditions: StringMap<VariantConditionValue>
  class: string | string[]
  fired: boolean
  mismatches: Array<{ key: string; expected: VariantConditionValue; got: unknown }>
}

export type ClassDiagnosis = {
  base: string
  tagMapClass: string | null
  tagMapBypassed: boolean
  recipeKey: string | undefined
  presetValues: AnyRecord | null
  effectiveVariants: AnyRecord
  compounds: CompoundTrace[]
  callerClass: string | undefined
  final: string
}

function conditionMatches(got: unknown, expected: unknown): boolean {
  if (Array.isArray(expected)) return expected.includes(got)
  return got === expected
}

export function diagnoseClassPipeline<TVariants extends VariantMap>(
  options: ClassPipelineOptions<TVariants>,
  tag: unknown,
  props: AnyRecord,
  className?: string,
  recipe?: string,
): ClassDiagnosis {
  const rawBase = options.baseClassName ?? ''
  const base = Array.isArray(rawBase) ? rawBase.join(' ') : rawBase

  const tagMapBypassed = recipe !== undefined
  const rawTagMapClass =
    typeof tag === 'string' && options.tagMap ? (options.tagMap[tag] ?? null) : null
  const tagMapClass = Array.isArray(rawTagMapClass) ? rawTagMapClass.join(' ') : rawTagMapClass

  const recipeMap = (options.recipeMap as StringMap<AnyRecord> | undefined) ?? {}
  const presetValues: AnyRecord | null = recipe !== undefined ? (recipeMap[recipe] ?? null) : null

  const defaults = (options.defaultVariants as AnyRecord | undefined) ?? {}
  const preset = presetValues ?? {}
  const effectiveVariants: AnyRecord = { ...defaults, ...preset, ...props }

  const rawCompounds = (options.compoundVariants as ReadonlyArray<AnyRecord>) ?? []
  const compounds: CompoundTrace[] = rawCompounds.map((compound) => {
    const { class: cls, ...conditions } = compound
    const typedConditions = conditions as StringMap<VariantConditionValue>
    const mismatches: CompoundTrace['mismatches'] = []

    iterate.forEachEntry(typedConditions, (key, expected) => {
      const got = effectiveVariants[key]
      if (!conditionMatches(got, expected)) mismatches.push({ key, expected, got })
    })

    return {
      conditions: typedConditions,
      class: cls as string | string[],
      fired: mismatches.length === 0,
      mismatches,
    }
  })

  const cvaFn = options.variants
    ? cva('', {
        variants: options.variants as never,
        defaultVariants: options.defaultVariants as never,
        compoundVariants: options.compoundVariants as never,
      })
    : null

  const variantClasses = cvaFn ? cvaFn({ ...preset, ...props }) : ''
  const staticPart = tagMapBypassed ? base : cn(base, tagMapClass)
  const final = cn(staticPart, variantClasses, className)

  return {
    base,
    tagMapClass,
    tagMapBypassed,
    recipeKey: recipe,
    presetValues,
    effectiveVariants,
    compounds,
    callerClass: className,
    final,
  }
}
