# @praxis-kit/core

This is where the enforcement lives. Tag resolution, prop merging, variant class generation,
children structure validation, ARIA policy enforcement — all of it framework-neutral, no React or
DOM dependency.

Framework adapters like `@praxis-kit/react` add a rendering layer on top. This package doesn't touch
rendering.

---

## Terminology

| Term             | Meaning                                                                                        |
| ---------------- | ---------------------------------------------------------------------------------------------- |
| Runtime          | The immutable `PolymorphicRuntime` object produced by `createPolymorphic`.                     |
| Resolver         | A subsystem that derives a value from normalized runtime state (e.g. tag or class resolution). |
| Validator        | A subsystem that evaluates structure or semantics and reports violations.                      |
| Policy engine    | A validator capable of evaluating and optionally mutating/fixing state.                        |
| Preset           | A named partial variant configuration merged into variant props before CVA evaluation.         |
| Owned prop       | A prop key consumed internally by the runtime or plugin system and stripped before render.     |
| Structural child | A child participating in rule-based validation inside `ChildrenEvaluator`.                     |
| Adapter          | Framework-specific integration layer responsible for rendering and framework interop.          |

---

## Core invariants

These hold across every render, regardless of which adapter is calling in:

- Runtime options are immutable after normalization.
- Caller props always override preset props.
- Validation always operates on normalized children.
- ARIA evaluation always runs against a pre-fix snapshot.
- Variant ownership and plugin ownership are tracked independently.
- Runtime behavior is deterministic after option normalization.
- Framework adapters never mutate runtime configuration.
- Validation systems report complete violation batches whenever possible.

---

## Entry point

```ts
import { createPolymorphic } from '@praxis-kit/core'

const runtime = createPolymorphic({
  tag: 'button',
  name: 'Button',
  styling: {
    variants: { size: { sm: 'text-sm', lg: 'text-lg' } },
    defaults: { size: 'sm' },
  },
})
```

`createPolymorphic` normalizes the options, builds the class pipeline, and returns a
`PolymorphicRuntime` object with four resolver methods and an `options` field.

---

## High-level lifecycle

```txt
FactoryOptions
  → resolveFactoryOptions
  → ResolvedFactoryOptions
  → createClassPipeline
  → PolymorphicRuntime
  → framework adapter
  → validation + policy enforcement
  → render
```

Adapters plug the runtime into a specific rendering environment. The runtime has no opinion on which
one.

---

## Package structure

```
src/
  factory/       createPolymorphic — the public entry point
  options/       resolveFactoryOptions — normalizes FactoryOptions → ResolvedFactoryOptions
  resolver/      resolveTag
  styles/        class pipeline: StaticClassResolver, VariantClassResolver, createClassPipeline
  children/      structural validation: ChildrenEvaluator and its four collaborators
  validator/     ARIA policy: AriaPolicyEngine, aria-role-policy
  base/          StrictBase — shared strict-mode behavior
  utils/         cn (clsx wrapper), mergeProps
  types/         all shared TypeScript types
```

Each subsystem is isolated. `factory/` knows about all of them; nothing else does. You can read
`children/` without touching `validator/`.

---

## The factory and runtime

`createPolymorphic` calls `resolveFactoryOptions` to produce a frozen `ResolvedFactoryOptions`
object — defaults filled in, optional fields conditionally spread to satisfy
`exactOptionalPropertyTypes`. It then calls `createClassPipeline` and closes over the result.

Nothing writes to `ResolvedFactoryOptions` after construction. Every resolver reads from it.

The returned `PolymorphicRuntime` exposes:

| Method                                            | What it does                                                                                                                                 |
| ------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `resolveTag()` / `resolveTag(as)`                 | Returns `as` if provided, otherwise `defaultTag`. Overloaded so the no-argument call returns exactly `TDefault`, not a union.                |
| `resolveProps(props)`                             | Shallow-merges `defaultProps` under caller props. Caller wins on any key conflict.                                                           |
| `resolveClasses(tag, props, className?, recipe?)` | Runs the full class pipeline and returns the final class string.                                                                             |
| `resolveAria(tag, props)`                         | Runs the ARIA policy engine (when `enforcement` is configured) and returns the — possibly fixed-up — props.                                  |
| `options`                                         | The frozen `ResolvedFactoryOptions` — single source of truth for all downstream behavior.                                                    |
| `classPlugin`                                     | Present only when `styling.plugin` produced one — the instantiated class plugin containing the active class pipeline and ownership metadata. |

---

## Adapter boundary

Adapters own rendering and nothing else:

- Render framework-specific elements/components.
- Normalize framework children into `unknown[]`.
- Filter owned props before render.
- Wire runtime diagnostics into framework behavior.
- Pass normalized runtime state into validators.

React, Vue, Svelte, and Solid get the same enforcement behavior because none of them implement it —
they call into this package. Variant logic, ARIA rules, and child validation are written once.

---

## The class pipeline

`createClassPipeline` composes two resolvers and `cn` (a `clsx` wrapper):

### StaticClassResolver

Handles `baseClassName` and `tagMap`. On each call it returns:

- Just `baseClassName` when no `tagMap` is configured, or when `variantKey` is active (preset
  rendering bypasses tag-map to avoid conflicting with preset intent).
- `baseClassName + tagMap[tag]` otherwise, with a per-tag string cache.

### VariantClassResolver

Handles CVA variant resolution and presets. On each `resolve({ props, variantKey })` call:

1. Looks up the cache. On a hit, promotes the entry to most-recently-used by deleting and re-adding
   its key to `#cacheOrder` (a `Set` whose iteration order is insertion order), then returns the
   cached string.
2. On a miss, calls `#compute`: looks up `presetMap[variantKey]` (defaults to `{}`), then calls
   `cvaFn({ ...preset, ...props })`. Preset props are merged _under_ caller props so explicit caller
   values always win and compound variants can fire across the preset boundary.
3. Stores the result. Evicts the least-recently-used entry when the cache exceeds 1000 entries (the
   head of `#cacheOrder` after LRU promotion).

The cache key is a sorted, type-prefixed serialisation of props + variantKey. Type prefixes (`s:`,
`b:`, `u`, `n`) prevent collisions between e.g. the string `"undefined"` and an absent value.

### Pipeline composition

```txt
tag + props + className? + variantKey?
  → StaticClassResolver.resolve(tag, hasVariantKey)     → staticClasses
  → VariantClassResolver.resolve({ props, variantKey }) → variantClasses
  → cn(staticClasses, variantClasses, className)        → final string
```

---

## The class plugin system

`createPolymorphic` accepts an optional `styling.plugin` field — a `ClassPluginFactory` that
replaces the default `createClassPipeline` with a custom implementation.

```ts
const runtime = createPolymorphic({
  tag: 'div',
  styling: {
    variants: { size: { sm: 'text-sm', lg: 'text-lg' } },
    plugin: (options, diagnostics) => createTailwindPipeline(options, diagnostics),
  },
})
```

### ClassPluginFactory

```ts
type ClassPluginFactory = <V extends VariantMap>(
  options: ClassPipelineOptions<V>,
  diagnostics: Diagnostics,
) => ClassPlugin
```

Called once at `createPolymorphic` time with the resolved `ClassPipelineOptions` and the component's
`Diagnostics` instance. Generic over `V` so it stays assignable under `exactOptionalPropertyTypes`
regardless of the caller's variant shape.

### ClassPlugin

```ts
type ClassPlugin = Readonly<{
  pipeline: ClassPipelineFn
  ownedKeys?: OwnedPropKeys
}>
```

`pipeline` replaces the built-in class pipeline. `ownedKeys` declares which prop keys the plugin
consumes — framework adapters strip these before render so they never reach the DOM. Tracked
separately from `variantKeys`, which the runtime owns.

### Runtime access

The instantiated plugin is stored on `PolymorphicRuntime.classPlugin`. Adapters read
`runtime.classPlugin?.ownedKeys` to build their prop-filter predicates.

---

## The children validation pipeline

`ChildrenEvaluator` orchestrates four collaborators. Call `evaluate(children)` with a pre-normalised
`unknown[]` — the React adapter handles `Children.toArray` + `isValidElement` filtering before this
point.

```txt
ChildrenEvaluator.evaluate(children)
  → RuleMatcher.match(children, rules)            → MatchMatrix
  → RuleValidator.validate(rules, matrix, n)      → cardinality + position checks
  → MatchValidator.validate(children, matrix)     → unexpected + ambiguous child checks
```

Matching, cardinality, ambiguity detection, and reporting are separate steps. Each can be read and
tested without touching the others.

```txt
children[]
    │
    ▼
RuleMatcher  (single traversal)
    ├────────────────────────────────────┐
    │                                    │
    ▼                                    ▼
forward map                         reverse map
child → rules matched               rule → children matched
    │                                    │
    ▼                                    ▼
MatchValidator                      RuleValidator
· unexpected child?                 · cardinality (min/max)?
· ambiguous match?                  · position (first/last)?
    │                                    │
    └──────────────────┬─────────────────┘
                       ▼
                 violations[]
              throw / warn / silent
```

### RuleMatcher

Builds the `MatchMatrix` in a single traversal — both directions at once:

- **forward** (`child → rules`) — detects children with no match (unexpected) or too many
  (ambiguous)
- **reverse** (`rule → children`) — counts matches per rule for cardinality and position checks

### RuleValidator

Iterates rules. For each rule, reads the reverse map to get a match count and checks:

- Cardinality bounds (`min` ≤ count ≤ `max` for bounded rules).
- Position constraint (`first` / `last` / `any`) against the matched child indices.

### MatchValidator

Iterates children. For each child, reads the forward map:

- No entry → unexpected child.
- `size === 1` → valid.
- `size > 1` → ambiguous (matched multiple rules).

All violations are batched before reporting so you see the complete picture in one throw, not one
failure at a time.

### Cardinality

Represented as a discriminated union:

```ts
type Cardinality = { kind: 'bounded'; min: number; max: number } | { kind: 'unbounded' }
```

`normalizeChildRule` converts the author-facing `CardinalityInput` (`{ min?, max? }`) to this form.
`position='first'|'last'` silently sets `max=1` (the rule targets exactly one child by definition).
`ChildrenEvaluator` rejects `max > 1` on positional rules as a structural impossibility.

### Strict mode in validation

All four collaborators extend `StrictBase`. Violations call `violate()`, which throws in
`strict='throw'` mode, logs a warning in `'warn'` mode, and is silent when `false`.

---

## The ARIA policy engine

`AriaPolicyEngine` validates `(tag, props)` pairs against a set of ARIA rules and optionally
auto-corrects the props.

### Two-phase snapshot model

#### Evaluate phase

All rules run against the same frozen `(tag, props, implicitRole)` snapshot captured at the start of
`evaluate()`. Every rule sees pre-fix state — diagnostics reflect the original intent, not the
outcome of earlier rule applications.

#### Fix phase

Violations marked `fixable: true` carry an `AriaFix` with a `kind` and an `apply()` function. Fixes
are deduplicated by `FixKind` before running: at most one executor per kind fires regardless of how
many rules emitted it. Fixes run sequentially on the evolving props, but only if `hasRole` is still
true after each step.

The return value carries both the full `violations` array and the `props` object (potentially with
roles stripped). Both signals arrive independently.

### Current rules

| Rule                                                                   | Severity | Fixable          |
| ---------------------------------------------------------------------- | -------- | ---------------- |
| `#checkInvalidRoleOverride` — strong implicit role + `role="region"`   | error    | yes (removeRole) |
| `#checkRedundantRole` — explicit role equals implicit role             | warning  | yes (removeRole) |
| `#checkStandaloneRegion` — standalone element assigned `role="region"` | error    | yes (removeRole) |

### Implicit role registry

`aria-role-policy.ts` maintains three structures:

- `implicitRoles` map — `tag → implicitRole` for the six landmark elements.
- `strongRoles` set — roles whose landmark semantics resist override with `role="region"`.
- `standaloneRoles` set — self-contained elements where `role="region"` is structurally incorrect
  regardless of implicit-role strength.

### Reporting

`report(violations)` routes by severity: `'error'` → `violate()`, `'warning'` → `warn()`. `warn()`
always caps at `console.warn` — it never throws even in `strict='throw'` mode, so redundant-role
warnings surface without aborting a render.

---

## StrictBase

`StrictBase` is the base class for every validation subsystem. It holds the `strict` field and
exposes three protected methods:

| Method                 | `strict=true/'throw'`    | `strict='warn'`          | `strict=false` |
| ---------------------- | ------------------------ | ------------------------ | -------------- |
| `violate(msg)`         | throws `Error`           | `console.warn`           | silent         |
| `warn(msg)`            | `console.warn`           | `console.warn`           | silent         |
| `invariant(cond, msg)` | calls `violate` if false | calls `violate` if false | silent         |

The `warn`/`violate` split exists for the ARIA engine: warnings surface in strict mode without
aborting a render.

---

## Key design decisions

### Preset merging via CVA input, not class concatenation

Preset values are `Partial<VariantProps<V>>` objects merged into the CVA call:

```ts
{ ...preset, ...props }
```

Caller props win on any conflict. Compound variants can fire across the preset+caller boundary
because CVA sees the merged object — not two separate strings concatenated afterward. Concatenation
would bypass CVA entirely.

---

### Discriminated union cardinality over `{ min, max }` with `Infinity` sentinels

`Infinity` as a sentinel would silently fall through switch statements without a case. The
discriminated union makes unbounded rules explicitly different in the type — the compiler sees it,
exhaustive switches work, and invariant checks are unambiguous.

---

### Bidirectional match matrix

Two directions, built in a single traversal over the children array:

- **forward** (`child → rules`) — feeds child-level checks (unexpected / ambiguous)
- **reverse** (`rule → children`) — feeds rule-level checks (cardinality / position)

Each validator only needs one direction. Neither has to re-traverse to get it.

---

### True LRU over FIFO in `VariantClassResolver`

FIFO would evict `{ size: 'md', intent: 'primary' }` — the most-rendered combination in a typical
app — once 1000 less common entries push through. LRU keeps hot combinations alive regardless of
when they were first inserted.

---

### Runtime-first, not component-first

The core export is a `PolymorphicRuntime`, not a component. Framework adapters render; this package
resolves. That split is what keeps the enforcement logic the same on every framework.

---

## Non-goals

These are questions that come up when you understand what the package does. They're worth answering
directly.

### Why not compile-time enforcement?

A Babel plugin or TypeScript transform can catch structural violations on static trees. Most
component trees aren't static — they're built from props, state, and data. Runtime enforcement
catches what compile-time can't: children passed as an array, conditional renders, content from a
server response. The two approaches aren't mutually exclusive, but this package can't be
compile-time-only without breaking the cases people actually hit in production.

### Why not a TypeScript language service plugin?

TypeScript LSP plugins run in the editor; they can't enforce anything at runtime. They also require
each consumer to configure a plugin in their `tsconfig`, which is a meaningful friction cost. The
runtime contract has zero configuration overhead for consumers — the rules run automatically when
the component renders.

### Why not AST-level enforcement?

AST analysis is framework-specific. JSX trees in React, templates in Vue, `{#each}` blocks in Svelte
— each has a different representation. The contract engine here works on the normalized `unknown[]`
children array that every adapter provides. One implementation, five frameworks.

### Why no global registry?

A global component registry would break isolation. Factory calls are self-contained: the returned
`PolymorphicRuntime` is the only artifact. No side effects, no module-scope state. SSR is safe.
Tests don't interfere with each other. Hot module replacement works without stale registrations.

### Why is this a runtime package, not a framework utility?

The same `FactoryOptions` definition drives React, Vue, Preact, Svelte, and Solid. If enforcement
lived in `@praxis-kit/react`, every framework adapter would need its own copy — or they'd share a
peer dependency with no clear ownership. Keeping it here means the contract is written once and the
behavior is identical everywhere.
