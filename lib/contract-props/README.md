# @praxis-kit/contract-props

Shared, framework-agnostic pieces of the mechanism that attaches a built praxis-kit component's
generics to its value type, so a parent component or wrapper can recover its Props for a specific
render mode — the same problem every adapter's own `ContractProps<T, Mode>` solves, without each
adapter re-deriving the mechanism from scratch.

Private workspace, bundled into whichever `praxis-kit` adapter entries need it.

---

## Why this exists

A built component's value type reaches TypeScript's checker one of two structurally different ways:

- **A single call/construct signature, or a plain object** (Vue, Solid, Svelte, Lit, Web) — the
  component's generics descriptor is already an ordinary, `infer`-able type parameter on the
  returned value's own type. Nothing needs to be attached; a parent recovers it with a plain `infer`
  conditional type against that adapter's own wrapper type.
- **An overloaded callable** (React, Preact) — `ComponentProps<typeof X>`/`Parameters<typeof X>[0]`
  always resolve against a function type's _last_ overload, so the component's generics aren't
  otherwise recoverable for any render mode but the one that overload is anchored to (normal mode,
  so tooling like Storybook keeps working). These adapters attach the generics via a phantom,
  type-only marker field instead.

What genuinely generalizes across every adapter that needs the second case — and is shared here,
rather than redefined per adapter — is the marker shape and the per-mode dispatch logic. What
_can't_ generalize is computing the three concrete per-mode prop shapes from a resolved generics
descriptor: that's inherently framework-specific (different fields per adapter — `className` vs.
`class`, different ref shapes), and TypeScript has no way to pass a generic type constructor as a
type argument (no higher-kinded types), so each adapter still owns that part locally.

## Exports

| Export                                    | Purpose                                                                                                                                                                                   |
| ----------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Mode`                                    | The three render modes a component's props can be typed for (`'normal' \| 'asChild' \| 'render'`) — not every adapter supports all three, but the union itself is one canonical type.     |
| `HasGenerics<G>`                          | The phantom marker shape (`{ readonly __generics?: G }`) an overloaded-callable adapter's component type extends/intersects, never assigned at runtime — the attachment mechanism itself. |
| `PickMode<M, TNormal, TAsChild, TRender>` | Selects one of three already-computed prop shapes by `Mode` — the one piece of dispatch logic every adapter's own `ContractProps<T, Mode>` is built from.                                 |

Development: `pnpm --filter @praxis-kit/contract-props test`, `typecheck`, `lint`.
