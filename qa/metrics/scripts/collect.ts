/**
 * Collects metrics from all data sources and writes snapshots/metrics.json.
 *
 * Sources:
 *   Bundles     — qa/tree-shaking-tests/snapshots/gzip.json
 *   Architecture — .repo-state/dependency-graph.json + exports.json
 *   Complexity   — ts-morph walk of lib/ and packages/core source files
 *
 * Run: pnpm --filter @praxis-kit/metrics collect
 */
import { readFile, writeFile } from 'node:fs/promises'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Node, Project, SyntaxKind } from 'ts-morph'
import type { DepGraph, ExportsFile, GzipSnapshot, PackageMetrics, Snapshot } from './types.ts'
import { iterate } from '@praxis-kit/primitive'
import type { StringMap } from '@praxis-kit/primitive'

const pkg = dirname(fileURLToPath(import.meta.url))
const root = join(pkg, '../../..')

async function readJson<T>(path: string): Promise<T> {
  return JSON.parse(await readFile(path, 'utf8')) as T
}

// ── Bundles ───────────────────────────────────────────────────────────────────

const gzipRaw = await readJson<GzipSnapshot>(
  join(root, 'qa/tree-shaking-tests/snapshots/gzip.json'),
)

const bundles: StringMap<number> = {}
iterate.forEach(
  Object.keys(gzipRaw).sort((a, b) => gzipRaw[b]!.gzip - gzipRaw[a]!.gzip),
  (scenario) => {
    bundles[scenario] = gzipRaw[scenario]!.gzip
  },
)

// ── Architecture ──────────────────────────────────────────────────────────────

const depGraph = await readJson<DepGraph>(join(root, '.repo-state/dependency-graph.json'))
const exportsFile = await readJson<ExportsFile>(join(root, '.repo-state/exports.json'))

function collectExports(file: ExportsFile): StringMap<{ values: number; types: number }> {
  const out: StringMap<{ values: number; types: number }> = {}
  const keys = Object.keys(file)
    .filter((k) => k !== 'generated' && k.startsWith('@'))
    .sort()
  iterate.forEach(keys, (name) => {
    const d = file[name] as { values?: string[]; types?: string[] }
    out[name] = { values: (d.values ?? []).length, types: (d.types ?? []).length }
  })
  return out
}

const architecture = {
  status: depGraph.status,
  violations: depGraph.violations.length,
  exports: collectExports(exportsFile),
}

// ── Complexity ────────────────────────────────────────────────────────────────

const SOURCE_PACKAGES = [
  { key: 'lib/primitive', src: 'lib/primitive/src' },
  { key: 'lib/contract', src: 'lib/contract/src' },
  { key: 'lib/styling', src: 'lib/styling/src' },
  { key: 'lib/adapter-utils', src: 'lib/adapter-utils/src' },
  { key: 'packages/core', src: 'packages/core/src' },
] as const

// One Project for all packages — parse and build AST once, not once per package.
const project = new Project({ skipAddingFilesFromTsConfig: true })
project.addSourceFilesAtPaths([
  ...SOURCE_PACKAGES.map(({ src }) => join(root, src, '**/*.ts')),
  `!${join(root, '**/*.test.ts')}`,
  `!${join(root, '**/*.bench.ts')}`,
  `!${join(root, '**/*.d.ts')}`,
])

// Pre-compute absolute prefix for each package so each source file can be
// routed to its bucket with a single startsWith check.
const prefixes = SOURCE_PACKAGES.map(({ key, src }) => ({
  prefix: join(root, src),
  key,
}))

const complexity: StringMap<PackageMetrics> = {}
iterate.forEach(SOURCE_PACKAGES, ({ key }) => {
  complexity[key] = { files: 0, functions: 0, loc: 0 }
})

function isModuleArrowFunction(node: Node): boolean {
  return (
    Node.isVariableDeclaration(node) &&
    node.getInitializerIfKind(SyntaxKind.ArrowFunction) !== undefined &&
    Node.isSourceFile(node.getParent()?.getParent()?.getParent())
  )
}

iterate.forEach(project.getSourceFiles(), (sf) => {
  const filePath = sf.getFilePath()

  const metrics = iterate.find(prefixes, ({ prefix, key }) =>
    filePath.startsWith(prefix) ? complexity[key] : null,
  )
  if (!metrics) return

  metrics.files++

  // LOC: single character scan — no split(), no per-line string allocation.
  const text = sf.getText()
  let i = 0
  const n = text.length
  while (i < n) {
    // Skip leading whitespace to detect blank/comment lines
    let j = i
    while (j < n && (text[j] === ' ' || text[j] === '\t')) j++
    const blank = j >= n || text[j] === '\n'
    const comment = !blank && text[j] === '/' && j + 1 < n && text[j + 1] === '/'
    // Advance to end of line
    while (i < n && text[i] !== '\n') i++
    i++ // skip \n
    if (!blank && !comment) metrics.loc++
  }

  // Function count: single AST traversal instead of four separate
  // getDescendantsOfKind calls (each of which walks the full AST).
  sf.forEachDescendant((node) => {
    switch (node.getKind()) {
      case SyntaxKind.FunctionDeclaration:
      case SyntaxKind.MethodDeclaration:
      case SyntaxKind.Constructor:
        metrics.functions++
        break
      case SyntaxKind.VariableDeclaration:
        if (isModuleArrowFunction(node)) metrics.functions++
        break
    }
  })
})

// ── Write snapshot ────────────────────────────────────────────────────────────

const snapshot = {
  generated: new Date().toISOString(),
  bundles,
  architecture,
  complexity,
} satisfies Snapshot

const outPath = join(pkg, '../snapshots/metrics.json')
await writeFile(outPath, JSON.stringify(snapshot, null, 2) + '\n')
console.log('metrics collected → snapshots/metrics.json')
