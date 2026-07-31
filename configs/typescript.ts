import tseslint from 'typescript-eslint'
import type { ESLintConfig } from './types'

const FILES = ['**/*.{js,mjs,cjs,ts,mts,cts,tsx}']
const TS_FILES = ['**/*.{ts,mts,cts,tsx}']

const config = [
  ...tseslint.configs.recommended.map((cfg) => ({
    ...cfg,
    files: FILES,
  })),

  {
    files: FILES,
    languageOptions: {
      parserOptions: {
        tsconfigRootDir: new URL('..', import.meta.url).pathname,
      },
    },
  },

  {
    files: FILES,

    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          args: 'all',
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
          ignoreRestSiblings: true,
        },
      ],

      '@typescript-eslint/consistent-type-imports': [
        'error',
        {
          prefer: 'type-imports',
          disallowTypeAnnotations: true,
          fixStyle: 'separate-type-imports',
        },
      ],
    },
  },

  {
    files: TS_FILES,

    languageOptions: {
      parserOptions: {
        projectService: {
          allowDefaultProject: [
            '*.ts',
            'configs/*.ts',
            'packages/*/eslint.config.ts',
            'lib/*/eslint.config.ts',
            'plugins/*/eslint.config.ts',
            'adapters/*/eslint.config.ts',
            // codemod and ts-plugin have rootDir:src — tsdown/vitest configs can't be in their tsconfig include
            'tooling/codemod/tsdown.config.ts',
            'tooling/codemod/vitest.config.ts',
            'plugins/typescript/tsdown.config.mts',
            // Playwright CT config and mount entry live outside the react/vue package tsconfig include
            'adapters/react/playwright-ct.config.ts',
            'adapters/react/playwright/index.tsx',
            'adapters/vue/playwright-ct.config.ts',
            'adapters/vue/playwright/index.ts',
            'playwright.workspace.ts',
            'vitest.workspace.ts',
            // lib packages whose vitest.config.ts lives outside their tsconfig include
            'lib/adapter-utils/vitest.config.ts',
            'lib/backend-utils/vitest.config.ts',
            'lib/primitive/vitest.config.ts',
            'lib/pipeline/vitest.config.ts',
            'lib/style/vitest.config.ts',
            'examples/*/vite.config.ts',
            // workspace vitest configs live outside any tsconfig include
            'runtime/*/vitest.config.ts',
            'backends/*/vitest.config.ts',
            'spikes/*/vitest.config.ts',
            // framework-specific scenarios are excluded from the tree-shaking-tests tsconfig
            // (jsxImportSource:react conflicts with Solid/Vue/Preact/Svelte JSX/return types)
            'qa/tree-shaking-tests/scenarios/solid-minimal/*.ts',
            'qa/tree-shaking-tests/scenarios/vue-minimal/*.ts',
            'qa/tree-shaking-tests/scenarios/preact-minimal/*.ts',
            'qa/tree-shaking-tests/scenarios/svelte-minimal/*.ts',
          ],
          maximumDefaultProjectFileMatchCount_THIS_WILL_SLOW_DOWN_LINTING: 85,
          defaultProject: './tsconfig.base.json',
        },
      },
    },

    rules: {
      '@typescript-eslint/consistent-type-exports': [
        'error',
        {
          fixMixedExportsWithInlineTypeSpecifier: false,
        },
      ],
    },
  },
] satisfies ESLintConfig

export default config
