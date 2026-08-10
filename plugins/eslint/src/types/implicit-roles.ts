import type { StringMap } from '@praxis-kit/primitive'

/** Shape of `IMPLICIT_ROLES` — per-tag unconditional implicit ARIA role, keyed by tag name. */
export type ImplicitRoleMap = Readonly<StringMap<string>>
