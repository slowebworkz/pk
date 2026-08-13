import type { ElementType, IntrinsicProps } from '../primitives'

// `extraProps`, when supplied, is the pre-variant-filter props object (the same one
// `normalize()` already receives) — used only as the evaluation context for a consumer's own
// `enforcement.aria`/`enforcement.rules`, so those rules can read a variant-only prop the built-in
// role-semantic pipeline and any fix output never see. Optional so passthrough/no-enforcement
// call sites don't need to supply it.
export type ResolveAriaFn = <P extends IntrinsicProps>(
  tag: ElementType,
  props: P,
  extraProps?: IntrinsicProps,
) => { props: P }
