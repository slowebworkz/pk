/**
 * Prints a human-readable summary of all built scenarios: live module count (bytesInOutput > 0),
 * unique lib packages retained, and gzip size vs snapshot.
 *
 * Run after `pnpm build`. Does not exit with an error code — use assert and gzip
 * scripts for CI-gating.
 */
import { readdir, readFile } from 'node:fs/promises'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { gzipSync } from 'node:zlib'
import type { StringMap } from '@praxis-kit/primitive'

const pkg = dirname(fileURLToPath(import.meta.url))
const distDir = join(pkg, '../dist')
const scenariosDir = join(pkg, '../scenarios')
const snapshotPath = join(pkg, '../snapshots/gzip.json')

type OutputInputs = StringMap<{ bytesInOutput: number }>
type Metafile = { outputs: StringMap<{ inputs: OutputInputs }> }
type Snapshot = StringMap<{ gzip: number }>

const scenarios = await readdir(scenariosDir, { withFileTypes: true }).then((entries) =>
  entries.filter((e) => e.isDirectory()).map((e) => e.name),
)

let snapshot: Snapshot = {}
try {
  snapshot = JSON.parse(await readFile(snapshotPath, 'utf8')) as Snapshot
} catch {
  /* no snapshot yet */
}

const LIB_TAGS = [
  'lib/primitive',
  'lib/styling',
  'lib/contract/src/aria',
  'lib/contract/src/children',
]

console.log('\nTree-shaking report\n' + '─'.repeat(72))
console.log(
  'Scenario'.padEnd(28) +
    'Modules'.padStart(8) +
    'Gzip'.padStart(10) +
    'vs snap'.padStart(10) +
    '  Retained lib features',
)
console.log('─'.repeat(72))

for (const scenario of scenarios) {
  let livePaths: string[] | null = null
  let bundleSize: number | null = null

  try {
    const metafile = JSON.parse(
      await readFile(join(distDir, scenario, 'meta.json'), 'utf8'),
    ) as Metafile
    livePaths = []
    for (const outData of Object.values(metafile.outputs)) {
      for (const [path, data] of Object.entries(outData.inputs)) {
        if (data.bytesInOutput > 0 && livePaths) livePaths.push(path)
      }
    }
  } catch {
    /* not built */
  }

  try {
    const raw = await readFile(join(distDir, scenario, 'bundle.js'))
    bundleSize = gzipSync(raw).length
  } catch {
    /* not built */
  }

  if (!livePaths) {
    console.log(`${'  ' + scenario} (not built — run pnpm build)`)
    continue
  }

  const moduleCount = livePaths.length

  const gzipStr = bundleSize !== null ? `${bundleSize}B` : '—'
  const snapBaseline = snapshot[scenario]?.gzip
  const deltaStr =
    bundleSize !== null && snapBaseline !== undefined
      ? `${bundleSize >= snapBaseline ? '+' : ''}${bundleSize - snapBaseline}`
      : '—'

  const features = LIB_TAGS.filter((tag) => livePaths!.some((p) => p.includes(tag)))
    .map((tag) => tag.replace(/^(?:lib|src)\//, ''))
    .join(', ')

  const scenarioName = scenario.padEnd(28)
  const modules = String(moduleCount).padStart(8)
  const gzip = gzipStr.padStart(10)
  const delta = deltaStr.padStart(10)
  const featureList = features || '(baseline)'

  console.log(`${scenarioName}${modules}${gzip}${delta}  ${featureList}`)
}

const TABLE_WIDTH = 72

console.log('─'.repeat(TABLE_WIDTH))
