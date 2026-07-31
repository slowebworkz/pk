import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: ['src/index.ts', 'src/core/index.ts', 'src/factory/index.ts'],
  format: ['esm'],
  dts: true,
  clean: true,
  fixedExtension: false,
})
