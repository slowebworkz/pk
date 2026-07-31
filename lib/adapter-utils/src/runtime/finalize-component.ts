import { COMPONENT_DEFAULT_TAG } from '@praxis-kit/primitive'
import type { SubComponentMap } from '@praxis-kit/primitive'
import { assembleCompoundComponent } from './assemble-compound-component'

/**
 * Attaches the resolved default-tag metadata and assembles any
 * sub-components onto a generated component — the tail every adapter
 * factory runs after building its framework component.
 *
 * Display-name handling stays a separate, explicit call in each adapter
 * (`applyDisplayName`) rather than folding in here, since React's version
 * additionally stamps a `COMPONENT_ID` for identity-based child matching
 * that the other adapters don't need.
 */
export function finalizeComponent<
  TComponent extends object,
  TSubComponents extends SubComponentMap,
>(
  component: TComponent,
  defaultTag: string | undefined,
  subComponents: TSubComponents | undefined,
): TComponent & TSubComponents {
  if (typeof defaultTag === 'string') {
    Object.assign(component, { [COMPONENT_DEFAULT_TAG]: defaultTag })
  }

  return assembleCompoundComponent(component, subComponents)
}
