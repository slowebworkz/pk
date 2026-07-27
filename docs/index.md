# praxis-kit documentation

Framework-neutral UI infrastructure with enforceable structural and accessibility contracts.

## Contents

| Document                                     | What it covers                                      |
| -------------------------------------------- | --------------------------------------------------- |
| [Getting started](../GETTING_STARTED.md)     | Installation, first component, quick reference      |
| [Architecture](../ARCHITECTURE.md)           | Layer model, dependency graph, design decisions     |
| [Examples](./examples.md)                    | Runnable examples across all adapters               |
| [Concepts](./concepts.md)                    | Core abstractions: polymorphism, contracts, styling |
| [Adapter authoring](../ADAPTER_AUTHORING.md) | Building a new framework adapter                    |
| [Migration](../MIGRATING.md)                 | Breaking-change migration guide                     |
| [Changelog](../CHANGELOG.md)                 | Release history                                     |
| [Design proposals](./design/)                | Unimplemented design docs for larger features       |

## Layer overview

```
@praxis-kit/primitive   — tag resolution, prop merge
@praxis-kit/styling     — variant resolver, class pipeline
@praxis-kit/contract    — ARIA engine, children validator, strict mode
@praxis-kit/core        — re-export facade (primitive + styling + contract)

@praxis-kit/react       — React 18/19 adapter
@praxis-kit/vue         — Vue 3 adapter
@praxis-kit/preact      — Preact adapter
@praxis-kit/solid       — SolidJS adapter
@praxis-kit/svelte      — Svelte 5 adapter
```

## Quick start

```ts
import { createContractComponent } from '@praxis-kit/react'

const Button = createContractComponent({
  tag: 'button',
  defaults: { type: 'button' },
  styling: {
    base: 'inline-flex items-center rounded font-medium',
    variants: {
      intent: {
        primary: 'bg-blue-600 text-white',
        ghost: 'bg-transparent text-gray-600',
      },
    },
    defaults: { intent: 'primary' },
  },
})
```

Replace `@praxis-kit/react` with the adapter for your framework — the factory API is identical
across all adapters.
