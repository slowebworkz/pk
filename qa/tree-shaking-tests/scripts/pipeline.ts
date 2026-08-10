/**
 * pipeline.ts
 *
 * Composes the three dependent steps of `pnpm test` — build → assert → gzip —
 * each of which reads what the previous step wrote to dist/, into a single
 * ordered pipeline instead of a shell `&&` chain. A failure at any step halts
 * the remaining ones with the same exit-code behavior as the shell version.
 *
 * Run: tsx scripts/pipeline.ts (or `pnpm test`)
 */

import { shallowObjectMerge, startPipeline } from '@praxis-kit/pipeline'
import { runPipeline, shellPass } from '@praxis-kit/pipeline/node'
import type { StringMap } from '@praxis-kit/primitive'

type Context = StringMap<never>

const nodeScriptPass = (name: string, script: string) =>
  shellPass<Context>(name, process.execPath, ['--experimental-strip-types', script])

const build = nodeScriptPass('build', 'scripts/analyze.ts')
const assert = nodeScriptPass('assert', 'scripts/assert.ts')
const gzip = nodeScriptPass('gzip', 'scripts/gzip.ts')

const pipeline = startPipeline<Context>({
  name: 'test',
  strategy: 'sequential',
  merge: shallowObjectMerge,
})
  .then(build)
  .then(assert)
  .then(gzip)
  .build()

await runPipeline(pipeline, {})
