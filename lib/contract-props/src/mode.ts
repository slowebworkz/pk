/**
 * The three render modes a praxis-kit component's props can be typed for, shared across every
 * adapter that has more than one — not every adapter supports all three (e.g. Preact has no
 * `'render'` mode), but the union itself stays one canonical type here rather than each adapter
 * redeclaring its own (partial, drift-prone) copy.
 *
 * - `'normal'` — the default render mode; `as` selects the host/intrinsic element.
 * - `'asChild'` — slot rendering: props merge onto a child element instead of a host element.
 * - `'render'` — a render callback receives the fully-resolved props and renders anything.
 */
export type Mode = 'normal' | 'asChild' | 'render'
