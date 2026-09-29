<script lang="ts">
  import type { Snippet } from 'svelte'
  import type { ClassValue } from 'svelte/elements'

  let { children, class: className = 'mb-3' }: { children: Snippet; class?: ClassValue } = $props()
</script>

<h3 class={['text-sm font-bold tracking-wide text-zinc-500 uppercase', className]}>{@render children()}</h3>
