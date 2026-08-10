import type { StringMap } from '@praxis-kit/primitive'

// ── Output ────────────────────────────────────────────────────────────────────

export type Snapshot = {
  generated: string
  bundles: StringMap<number>
  architecture: {
    status: string
    violations: number
    exports: StringMap<{ values: number; types: number }>
  }
  complexity: StringMap<{ files: number; functions: number; loc: number }>
}

export type PackageMetrics = { files: number; functions: number; loc: number }

// ── Input (JSON source shapes) ────────────────────────────────────────────────

export type GzipSnapshot = StringMap<{ gzip: number }>

export type DepGraph = {
  status: string
  violations: unknown[]
  packageImports: StringMap<string[]>
}

// Index signature must include `| string` to be compatible with `generated: string`.
export type ExportsFile = {
  generated: string
  [pkg: string]: { values?: string[]; types?: string[] } | string
}
