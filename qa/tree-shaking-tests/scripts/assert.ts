/**
 * Reads each scenario's esbuild metafile and validates it against the scenario's
 * expected.json.
 *
 * mustInclude entries must match at least one input that contributed bytes to the output.
 * mustExclude entries must match zero inputs that contributed bytes to the output.
 *
 * Uses outputs[].inputs[].bytesInOutput rather than top-level inputs so tree-shaken
 * modules (analyzed but contributing 0 bytes) do not trigger false failures.
 *
 * Exits with code 1 if any assertion fails.
 */
import { readdir, readFile } from 'node:fs/promises'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { AnyRecord, StringMap } from '@praxis-kit/primitive'

const pkg = dirname(fileURLToPath(import.meta.url))
const distDir = join(pkg, '../dist')
const scenariosDir = join(pkg, '../scenarios')

type Expected = {
  mustInclude: string[]
  mustExclude: string[]
}

type OutputInputs = StringMap<{ bytesInOutput: number }>

type Metafile = {
  inputs: AnyRecord
  outputs: StringMap<{ inputs: OutputInputs }>
}

function getLiveInputPaths(metafile: Metafile): string[] {
  const live: string[] = []
  for (const outData of Object.values(metafile.outputs)) {
    for (const [path, data] of Object.entries(outData.inputs)) {
      if (data.bytesInOutput > 0) live.push(path)
    }
  }
  return live
}

function check(scenario: string, metafile: Metafile, expected: Expected): string[] {
  const live = getLiveInputPaths(metafile)
  const failures: string[] = []

  for (const fragment of expected.mustInclude) {
    if (!live.some((p) => p.includes(fragment))) {
      failures.push(
        `FAIL [${scenario}] mustInclude "${fragment}" — not found in bundle output (0 live bytes)`,
      )
    }
  }

  for (const fragment of expected.mustExclude) {
    const matched = live.filter((p) => p.includes(fragment))
    if (matched.length > 0) {
      failures.push(
        `FAIL [${scenario}] mustExclude "${fragment}" — unexpectedly contributed live code:\n` +
          matched.map((p) => `       ${p}`).join('\n'),
      )
    }
  }

  return failures
}

const scenarios = await readdir(scenariosDir, { withFileTypes: true }).then((entries) =>
  entries.filter((e) => e.isDirectory()).map((e) => e.name),
)

const allFailures: string[] = []
let passed = 0

for (const scenario of scenarios) {
  const metaPath = join(distDir, scenario, 'meta.json')
  const expectedPath = join(scenariosDir, scenario, 'expected.json')

  let metafile: Metafile
  let expected: Expected

  try {
    metafile = JSON.parse(await readFile(metaPath, 'utf8')) as Metafile
  } catch {
    allFailures.push(`FAIL [${scenario}] meta.json missing — run pnpm build first`)
    continue
  }

  try {
    expected = JSON.parse(await readFile(expectedPath, 'utf8')) as Expected
  } catch {
    allFailures.push(`FAIL [${scenario}] expected.json missing or invalid`)
    continue
  }

  const liveCount = getLiveInputPaths(metafile).length
  const failures = check(scenario, metafile, expected)
  if (failures.length === 0) {
    console.log(`  pass   ${scenario} (${liveCount} live modules)`)
    passed++
  } else {
    for (const f of failures) console.error(f)
    allFailures.push(...failures)
  }
}

console.log(`\n${passed}/${scenarios.length} scenario(s) passed assertions`)

if (allFailures.length > 0) {
  process.exit(1)
}
