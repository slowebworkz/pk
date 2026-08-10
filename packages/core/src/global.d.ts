// Bundlers (esbuild, Rollup, webpack, Vite) statically replace `process.env.NODE_ENV` with a
// string literal at build time, enabling dead-code elimination of dev-only guards in production
// builds. This package has no runtime dependency on Node — this ambient declaration exists only
// so `tsc` recognizes the global `process.env.NODE_ENV` checks those dev-only guards rely on,
// without pulling in `@types/node` or any other Node-specific types for a single global.
declare const process: { env: { NODE_ENV: string } }
