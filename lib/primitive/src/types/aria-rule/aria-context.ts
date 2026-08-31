import type { ReadonlyDeep } from 'type-fest'
import type { AriaRole, IntrinsicProps, IntrinsicTag } from '../primitives'

export type AriaContext = {
  /**
   * The intrinsic HTML tag being evaluated.
   */
  readonly tag: IntrinsicTag

  /**
   * The implicit ARIA role associated with the intrinsic tag.
   */
  readonly implicitRole: AriaRole | undefined

  /**
   * The effective ARIA role after considering the element's explicit
   * `role` attribute or component-provided role.
   */
  readonly effectiveRole: string | undefined

  /**
   * The component's props available to the ARIA policy engine.
   */
  readonly props: ReadonlyDeep<IntrinsicProps>

  /**
   * Variant prop names declared by the component.
   *
   * The adapter uses these names to determine which props are intercepted
   * before reaching the DOM. A rule asserting a fact about a real HTML
   * attribute should therefore treat a key present here as a component
   * variant rather than a DOM attribute.
   *
   * An empty set indicates no variant props are declared — the case for
   * evaluations with no factory context, such as `AriaPolicyEngine.evaluate`.
   */
  readonly variantKeys: ReadonlySet<string>
}
