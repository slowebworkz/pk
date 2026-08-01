<script lang="ts">
  import Polymorphic from 'praxis-kit/svelte/Polymorphic.svelte'
  import { buttonBundle } from './button'
  import type { Snippet } from 'svelte'

  interface Props {
    intent?: 'primary' | 'secondary' | 'ghost'
    size?: 'sm' | 'md' | 'lg'
    variantKey?: 'cta' | 'subtle'
    disabled?: boolean
    loading?: boolean
    class?: string
    onclick?: (e: MouseEvent) => void
    children?: Snippet
    [key: string]: unknown
  }

  let { children, ...rest }: Props = $props()
</script>

<Polymorphic bundle={buttonBundle} {...rest}>
  {@render children?.()}
</Polymorphic>
