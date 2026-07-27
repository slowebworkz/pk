import type { DiagnosticInput } from '@praxis-kit/diagnostics'
import { DiagnosticCategory, DiagnosticCode } from '@praxis-kit/diagnostics'

export const TailwindDiagnostics = {
  multipleDisplayProps(active: string[]): DiagnosticInput {
    return {
      code: DiagnosticCode.TailwindMultipleDisplayProps,
      category: DiagnosticCategory.Contract,
      message: `[createTailwindPipeline] Multiple display props set (${active.join(', ')}); "${active[0]}" takes precedence.`,
    }
  },

  reservedLayoutLiteral(reserved: string[]): DiagnosticInput {
    return {
      code: DiagnosticCode.TailwindReservedLayoutLiteral,
      category: DiagnosticCategory.Contract,
      message:
        `[createTailwindPipeline] Reserved display class(es) ${reserved.map((r) => `"${r}"`).join(', ')} found in resolved classes. ` +
        'The display mode is controlled by the display props (flex, inline-flex, grid, block, hidden, etc.), not by class strings.',
    }
  },

  deadVariantClass(dim: string, value: string, mode: string, classStr: string): DiagnosticInput {
    return {
      code: DiagnosticCode.TailwindDeadVariantClass,
      category: DiagnosticCategory.Contract,
      message:
        `[createTailwindPipeline] Variant "${dim}=${value}" contributes only classes stripped under ` +
        `layout mode "${mode}" ("${classStr}") — it produces nothing in this mode.`,
    }
  },

  layoutOnVoidTag(tag: string, mode: string): DiagnosticInput {
    return {
      code: DiagnosticCode.TailwindLayoutOnVoidTag,
      category: DiagnosticCategory.Contract,
      message:
        `[createTailwindPipeline] "${mode}" sets <${tag}>'s inner display, but <${tag}> is a void ` +
        `element and can never have children — there is nothing for a flex/grid formatting context ` +
        `to apply to, so "${mode}" (and any gap-* utility) has no effect here.`,
    }
  },
}
