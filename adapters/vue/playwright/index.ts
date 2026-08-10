import { beforeMount, afterMount } from '@playwright/experimental-ct-vue/hooks'
import type { StringMap } from '@praxis-kit/primitive'

beforeMount<StringMap>(async () => {
  // Global setup for all CT tests — add context providers here if needed.
})

afterMount<StringMap>(async () => {
  // Global teardown after each mounted component.
})
