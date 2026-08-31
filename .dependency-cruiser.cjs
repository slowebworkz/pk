/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    // ── lib/ layer invariants ─────────────────────────────────────────────
    {
      name: 'primitive-no-upper-layers',
      severity: 'error',
      comment: 'lib/primitive is the lowest layer — may not import contract, styling, or adapters',
      from: { path: '^lib/primitive/' },
      to: { path: '^(lib/(contract|styling|adapter-utils)|packages/)' },
    },
    {
      name: 'contract-no-styling',
      severity: 'error',
      comment: 'lib/contract must not import lib/styling — enforcement is orthogonal to styling',
      from: { path: '^lib/contract/' },
      to: { path: '^lib/styling/' },
    },
    {
      name: 'contract-no-adapters',
      severity: 'error',
      comment: 'lib/contract must remain renderer-neutral — no adapter imports',
      from: { path: '^lib/contract/' },
      to: { path: '^(lib/adapter-utils|packages/(react|vue|preact|solid|svelte))/' },
    },
    {
      name: 'styling-no-adapters',
      severity: 'error',
      comment:
        'lib/styling must not import framework adapters — styling is orthogonal to rendering',
      from: { path: '^lib/styling/' },
      to: { path: '^(lib/adapter-utils|packages/(react|vue|preact|solid|svelte))/' },
    },
    {
      name: 'adapter-utils-no-adapters',
      severity: 'error',
      comment: 'lib/adapter-utils must not import framework-specific adapter packages',
      from: { path: '^lib/adapter-utils/' },
      to: { path: '^packages/(react|vue|preact|solid|svelte)/' },
    },
    {
      name: 'pipeline-kit-core-no-factory',
      severity: 'error',
      comment:
        'lib/pipeline-kit/src/core is the agnostic Pipeline shape — must not depend on the ' +
        'resolved-config construction pattern in src/factory, which is one optional consumer of it',
      from: { path: '^lib/pipeline-kit/src/core/' },
      to: { path: '^lib/pipeline-kit/src/factory/' },
    },

    // ── framework leakage ──────────────────────────────────────────────────
    {
      name: 'core-no-react',
      severity: 'error',
      comment: 'core must remain framework-agnostic — no React imports allowed',
      from: { path: '^packages/core/' },
      to: {
        dependencyTypes: ['npm', 'npm-dev', 'npm-peer', 'npm-no-pkg', 'unknown'],
        path: '^(react|react-dom|@radix-ui/)',
      },
    },
    {
      name: 'core-no-vue',
      severity: 'error',
      comment: 'core must remain framework-agnostic — no Vue imports allowed',
      from: { path: '^packages/core/' },
      to: {
        dependencyTypes: ['npm', 'npm-dev', 'npm-peer', 'npm-no-pkg', 'unknown'],
        path: '^(vue|@vue/)',
      },
    },
    {
      name: 'lib-primitive-no-frameworks',
      severity: 'error',
      comment: 'lib/primitive must have zero framework dependencies',
      from: { path: '^lib/primitive/' },
      to: {
        dependencyTypes: ['npm', 'npm-dev', 'npm-peer', 'npm-no-pkg', 'unknown'],
        path: '^(react|react-dom|vue|@vue/|preact|solid-js|svelte)',
      },
    },
    {
      name: 'lib-contract-no-frameworks',
      severity: 'error',
      comment: 'lib/contract must remain renderer-neutral — no framework npm deps',
      from: { path: '^lib/contract/' },
      to: {
        dependencyTypes: ['npm', 'npm-dev', 'npm-peer', 'npm-no-pkg', 'unknown'],
        path: '^(react|react-dom|vue|@vue/|preact|solid-js|svelte)',
      },
    },
    {
      name: 'lib-styling-no-frameworks',
      severity: 'error',
      comment: 'lib/styling must not depend on framework packages',
      from: { path: '^lib/styling/' },
      to: {
        dependencyTypes: ['npm', 'npm-dev', 'npm-peer', 'npm-no-pkg', 'unknown'],
        path: '^(react|react-dom|vue|@vue/|preact|solid-js|svelte)',
      },
    },

    // ── cross-adapter isolation ────────────────────────────────────────────
    {
      name: 'react-no-vue',
      severity: 'error',
      comment: 'react adapter must not import from the vue adapter',
      from: { path: '^packages/react/' },
      to: { path: '^packages/vue/' },
    },
    {
      name: 'vue-no-react',
      severity: 'error',
      comment: 'vue adapter must not import from the react adapter',
      from: { path: '^packages/vue/' },
      to: { path: '^packages/react/' },
    },
    {
      name: 'react-no-vue-pkg',
      severity: 'error',
      from: { path: '^packages/react/' },
      to: {
        dependencyTypes: ['npm', 'npm-dev', 'npm-peer', 'npm-no-pkg', 'unknown'],
        path: '^(vue|@vue/)',
      },
    },
    {
      name: 'vue-no-react-pkg',
      severity: 'error',
      from: { path: '^packages/vue/' },
      to: {
        dependencyTypes: ['npm', 'npm-dev', 'npm-peer', 'npm-no-pkg', 'unknown'],
        path: '^(react|react-dom)',
      },
    },

    // ── dependency direction ───────────────────────────────────────────────
    {
      name: 'core-no-adapters',
      severity: 'error',
      comment: 'core must not import from framework adapters or docs',
      from: { path: '^packages/core/' },
      to: { path: '^packages/(react|vue|tailwind|docs)/' },
    },
    {
      name: 'tailwind-no-adapters',
      severity: 'error',
      comment: 'tailwind plugin must not import from framework adapters',
      from: { path: '^packages/tailwind/' },
      to: { path: '^packages/(react|vue|docs)/' },
    },

    // ── cycles ────────────────────────────────────────────────────────────
    {
      name: 'no-circular',
      severity: 'error',
      comment:
        'type-only cycles (import type / export type) are erased at compile time and carry ' +
        'no runtime risk — e.g. recursive tree ADTs like TreeNode. Only flag cycles where ' +
        'every edge in the loop is a real (value) import.',
      from: {},
      to: { circular: true, viaOnly: { dependencyTypesNot: ['type-only'] } },
    },

    // ── orphans ───────────────────────────────────────────────────────────
    {
      name: 'no-orphans',
      severity: 'warn',
      from: {
        orphan: true,
        pathNot: [
          '\\.d\\.ts$',
          '(^|/)\\.[^/]+(\\.js)?$',
          '\\.json$',
          'vitest[^/]*\\.config',
          'tsup\\.config',
          'eslint\\.config\\.ts$',
          'test-setup\\.ts$',
          'examples/(react|vue)/src/',
          'lib/bundle-analysis/src/',
          'packages/tree-shaking-tests/scenarios/',
          // Only consumed via the `@praxis-kit/shared/tests` path alias (tsconfig.paths.json)
          // from adapters/, a workspace root this scan doesn't cruise.
          'lib/primitive/src/tests/index\\.ts$',
        ],
      },
      to: {},
    },
  ],

  options: {
    doNotFollow: { path: 'node_modules' },
    exclude: {
      path: '(\\.test\\.(ts|tsx)$|\\.bench\\.ts$|vitest\\.config|tsup\\.config|dist/|playwright/\\.cache/)',
    },
    moduleSystems: ['es6'],
    tsPreCompilationDeps: true,
    tsConfig: { fileName: 'tsconfig.base.json' },
    enhancedResolveOptions: {
      exportsFields: ['exports'],
      conditionNames: ['import', 'require', 'node', 'default'],
    },
    reporterOptions: {
      dot: { collapsePattern: 'node_modules/[^/]+' },
    },
  },
}
