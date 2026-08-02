import type { AnyRecord, EmptyRecord, NoPluginProps } from '../primitives'
import type { ClassPipelineOptions } from '../pipeline/class-pipeline-options'
import type { VariantMap } from '../variants'
import type { ClassPlugin } from './class-plugin'
import type { Diagnostics } from '@praxis-kit/diagnostics'

export type ClassPluginFactory<TProps extends AnyRecord = EmptyRecord> = <V extends VariantMap>(
  options: ClassPipelineOptions<V>,
  diagnostics: Diagnostics,
) => ClassPlugin<TProps>

/** `ClassPluginFactory` with its plugin-owned-props generic erased — the common form used
 *  wherever a factory's concrete plugin-props shape isn't tracked (factory generics,
 *  capability wiring). */
export type AnyClassPluginFactory = ClassPluginFactory<AnyRecord> | undefined

export type ExtractPluginProps<TPlugin extends AnyClassPluginFactory> =
  TPlugin extends ClassPluginFactory<infer T>
    ? string extends keyof T
      ? NoPluginProps
      : T
    : NoPluginProps

export type PluginInstance<TPlugin extends AnyClassPluginFactory> =
  TPlugin extends ClassPluginFactory<infer TProps> ? ClassPlugin<TProps> : undefined
