import type tsserverlibrary from 'typescript/lib/tsserverlibrary'
import { checkNoEnforcementWithoutStrict } from './diagnostics/no-enforcement-without-strict'
import { checkValidCardinality } from './diagnostics/valid-cardinality'

type TS = typeof tsserverlibrary

const DEFAULT_CALLEE_NAMES: readonly string[] = ['createContractComponent']

function init(modules: { typescript: TS }) {
  const ts = modules.typescript

  function create(info: tsserverlibrary.server.PluginCreateInfo): tsserverlibrary.LanguageService {
    const calleeNames: ReadonlySet<string> = new Set(
      (info.config as { calleeNames?: string[] }).calleeNames ?? DEFAULT_CALLEE_NAMES,
    )

    const proxy: tsserverlibrary.LanguageService = Object.create(null)

    for (const k of Object.keys(info.languageService) as Array<
      keyof tsserverlibrary.LanguageService
    >) {
      const x = info.languageService[k]
      Reflect.set(
        proxy,
        k,
        typeof x === 'function'
          ? (x as (...a: unknown[]) => unknown).bind(info.languageService)
          : x,
      )
    }

    proxy.getSemanticDiagnostics = (fileName: string) => {
      const existing = info.languageService.getSemanticDiagnostics(fileName)
      const program = info.languageService.getProgram()
      if (!program) return existing
      const sourceFile = program.getSourceFile(fileName)
      if (!sourceFile) return existing

      const extra = [
        ...checkNoEnforcementWithoutStrict(ts, sourceFile, calleeNames),
        ...checkValidCardinality(ts, sourceFile, calleeNames),
      ]

      return [...existing, ...extra]
    }

    return proxy
  }

  return { create }
}

export = init
