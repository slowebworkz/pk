<script lang="ts">
  import Polymorphic from './Polymorphic.svelte'
  import type { AnyBuiltRuntime } from './types/built-runtime'

  let { root, childBundles }: { root: AnyBuiltRuntime; childBundles: readonly AnyBuiltRuntime[] } =
    $props()
</script>

<Polymorphic bundle={root}>
  {#snippet children()}
    {#each childBundles as child}
      <Polymorphic bundle={child} />
    {/each}
  {/snippet}
</Polymorphic>
