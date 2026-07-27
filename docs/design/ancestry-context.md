# Design: ancestry-aware component validation

Status: proposal, no implementation yet. Scoped as the first step on the largest open item in
downstream findings — a component validating itself against its rendered parent, not just a parent
validating its children.

## Problem

Every validation mechanism praxis-kit ships today is parent-to-child, one level deep:

- `enforcement.children` (`ChildRuleInput`, `ChildrenEvaluator`) — a parent inspects its own direct
  children's tag/type/props.
- `enforcement.aria` / `enforcement.rules` (`AriaRule`, `AriaPolicyEngine`) — a component validates
  its own tag/props/implicit role.
- The built-in HTML content-model contracts (`pictureContract`, `mediaContract`, `labelContract`,
  ...) — same shape as `enforcement.children`, just shipped in-box.

None of these let a component see anything about _what it's rendered inside of_. That's fine for
most elements, but a real, recurring HTML shape doesn't fit it: an element whose valid/relevant
attributes depend on which parent it's under, not on anything the element's own tag or props can
express.

Two confirmed reference cases:

- **`<source>`** inside `<picture>` wants `srcset`/`sizes`/`media` (no `src`); inside
  `<audio>`/`<video>` it wants `src`/`type` (no `srcset`). Both attribute sets are always
  syntactically legal on `<source>` — nothing rejects the "wrong" one at parse time. Which one is
  dead weight depends entirely on the resolved parent.
- **`<li value="...">`** — `value` sets the item's ordinal and only has any effect under `<ol>`;
  it's silently inert under `<ul>`/`<menu>`. Same shape: always legal, contextually meaningful.

Parent-side contracts (`pictureContract`, `mediaContract`, `listContract`) already know `source`/
`li` are structurally valid children. What's missing is the other direction: `source` itself has no
way to know, and therefore no way to warn, when its own attributes don't match the parent it
actually landed in.

## Non-goals for v1

- **Full accessible-name / `for`-target computation.** A separate, harder problem — `for` targets an
  arbitrary element by ID anywhere in the tree, which needs a DOM query or a whole-tree ID registry,
  not ancestry. Out of scope here.
- **Compile-time narrowing.** `Source`'s prop type stays the permissive union of every context's
  valid shape. TypeScript can't narrow "which provider wraps this JSX node," and trying to encode
  the constraint in types would need machinery far more invasive than a runtime check. Typed
  compound components (`Picture.Source`, `Video.Source`) narrowing at the call site are a possible
  _later_, non-breaking addition on top of the same runtime piece — not a prerequisite.
- **Full seven-adapter parity in the first PR.** Cross-adapter parity is a hard requirement for
  calling this feature _done_ and public, but the phased rollout below deliberately lands the core
  primitive and one adapter binding first, validated end-to-end, before touching the rest.

## Core primitive (framework-neutral)

Lives beside the existing framework-neutral contract layer (`lib/contract`), not inside any adapter.
Two halves: a channel identity, and a registered value a descendant can look up.

```ts
// lib/contract/src/ancestry/channel.ts
export type AncestryChannel<T> = {
  readonly name: string
}

export function createAncestryChannel<T>(name: string): AncestryChannel<T> {
  return { name }
}
```

`name` exists for diagnostics and debugging (so a mismatch error can say `"picture"`, not print an
opaque object) — lookup itself is by channel identity, not by string, the same way `isTag`'s
`COMPONENT_DEFAULT_TAG` resolves by symbol identity rather than a string compare (a lesson from a
past bug: string-description matching there was a spoofable, looser check than identity).

## Config surface

Two new, symmetric options on `FactoryOptions`/`EnforcementOptions` — a parent opts in to
_providing_ a channel, a child opts in to _reading_ one:

```ts
// Parent side (e.g. Picture's own options)
providesAncestry?: {
  readonly channel: AncestryChannel<TValue>
  readonly value: TValue | ((props: Readonly<Props>) => TValue)
}

// Child side (e.g. Source's own options, under enforcement)
enforcement: {
  ancestry?: {
    readonly channel: AncestryChannel<TValue>
    /** Returns diagnostics given the channel's current value (or undefined, if not
     *  rendered inside any provider for this channel) and this component's own props. */
    readonly validate: (
      value: TValue | undefined,
      props: Readonly<Props>,
    ) => readonly AriaResult[]
  }
}
```

Reuses `AriaResult` (`valid`/`fixable`/`severity`/`diagnostic`) rather than inventing a fourth
result shape alongside `ChildViolation`/`AriaResult` — ancestry validation is conceptually "does
this prop combination make sense," the same question `AriaRule` already answers, just keyed off
ancestry state instead of the element's own tag/role.

Named-channel matching (not raw tag matching) is deliberate: `Source` shouldn't need to know
`Picture` literally renders as `<picture>` — a design system wrapping `Picture` in its own component
should still be able to provide the same channel. This mirrors the existing precedent of
`enforcement.children`'s `match` predicates matching by resolved semantic tag (`isTag`/`getTag`)
rather than raw `child.type`.

### Worked example

```ts
// Picture's own options
const pictureAncestry = createAncestryChannel<{ readonly kind: 'picture' }>('picture')

const pictureOptions = {
  tag: 'picture',
  providesAncestry: { channel: pictureAncestry, value: { kind: 'picture' } },
  // ...
}

// Source's own options
const sourceOptions = {
  tag: 'source',
  enforcement: {
    ancestry: {
      channel: pictureAncestry,
      validate: (value, props) => {
        if (value === undefined) return [] // not inside a Picture — audio/video's own concern
        if ('src' in props) {
          return [{ valid: false, fixable: false, severity: 'warning', diagnostic: /* ... */ }]
        }
        return []
      },
    },
  },
}
```

## Adapter bindings

The primitive itself is inert data — each adapter needs a thin binding that (a) makes a provided
value reachable by descendants during render, and (b) hands the resolved value to
`enforcement.ancestry.validate` at the same point `enforcement.aria`/`enforcement.children` already
run (dev-only, stripped in production, same as every other validation path).

| Adapter | Provide mechanism             | Read mechanism                             |
| ------- | ----------------------------- | ------------------------------------------ |
| React   | `Context.Provider`            | `useContext`                               |
| Preact  | `Context.Provider` (compat)   | `useContext`                               |
| Vue     | `provide()`                   | `inject()`                                 |
| Svelte  | `setContext()`                | `getContext()`                             |
| Solid   | `createContext` + `Provider`  | `useContext`                               |
| Lit     | `@lit/context` provider mixin | `@lit/context` consumer mixin              |
| Web     | _(no provider needed)_        | DOM `closest()` walk from the host element |

Plain web components are the one adapter where "provide" isn't a distinct step — there's no
component tree, only the DOM, so a channel's active value is whatever the nearest matching ancestor
element currently holds (read directly off that element, e.g. a data attribute or an internal
WeakMap keyed by element), found via `closest()`. Every other adapter needs an explicit provider
wrapping the parent's render output.

## Performance

Cost must be proportional to "components that declare `providesAncestry`," not "does anything below
happen to read it" — the second would need whole-subtree static analysis this system doesn't have.
Concretely: a component's own render only pays for a provider wrap when _its own_
`options.providesAncestry` is set. A component with no `providesAncestry` renders exactly as it does
today — no context object created, no provider mounted, no behavior change. This is the same
opt-in-cost shape `htmlChildrenEvaluatorFn` already has (only tags with a real built-in contract pay
for evaluation; everything else is a `Map` miss returning `undefined`).

## Diagnostics integration

`enforcement.ancestry.validate` runs at the same point in each adapter's render function as
`childrenEvaluator`/`htmlChildrenEvaluatorFn` do today (see `adapters/*/render.ts` /
`create-contract-component.ts`), gated the same way (`process.env.NODE_ENV !== 'production'`).
Results route through the same `Diagnostics` instance the component's own `enforcement.diagnostics`
resolves to — no new diagnostic-routing concept, just a new call site feeding the existing one.

## Phased rollout

1. **Core primitive only.** `createAncestryChannel`, the `providesAncestry`/`enforcement.ancestry`
   type additions to `FactoryOptions`/`EnforcementOptions`. No adapter changes yet — nothing calls
   into this, so it's inert and safe to land and review on its own.
2. **One adapter, end-to-end.** React binding (`Context`), wired into `adapters/react`'s `render.ts`
   at the same spot as the `htmlChildrenEvaluatorFn` call this repo just added context to. A small
   internal fixture (not yet `Picture`/`Source` — those belong to a downstream consumer, not this
   repo) exercising provide → read → validate, with tests proving: value flows through, validation
   fires, and a component with no `providesAncestry` has zero added provider/context overhead.
3. **Remaining six adapters.** Preact, Vue, Svelte, Solid, Lit, Web, each getting the binding shape
   from the table above plus adapter-specific conformance tests (this repo's existing pattern for
   cross-adapter parity, per `CLAUDE.md`'s "add per-adapter smoke tests before exposing new
   framework packages"). Not shippable as a public, documented feature until all seven pass — a
   React-only ancestry mechanism would be worse than none, since a consumer couldn't rely on it
   being there for every framework praxis-kit claims to support.
4. **Public export + docs.** `providesAncestry`/`enforcement.ancestry` become part of the documented
   public surface (`docs/concepts.md` gets a section), once all seven adapters carry it.

Steps 3 and 4 are explicitly not scoped into the first PR that lands step 1–2; they're the condition
for calling the feature complete, not a checklist item to rush through in one branch.

## Explicitly deferred, revisit only if a concrete need appears

- Typed compound components (`Picture.Source`) narrowing props at the call site — non-breaking,
  additive, sits on top of the runtime piece once it exists.
- A `category`-style unification with `enforcement.rules`/`enforcement.aria` — ancestry validation
  reuses `AriaResult` for its output shape, but stays its own `enforcement.ancestry` bucket rather
  than trying to merge into the existing `AriaPolicyEngine` machinery, since ancestry's input (a
  channel value, not the element's own props) doesn't fit that engine's per-rule cache
  (`readsProps`) model without distortion.
