<script lang="ts">
  import type { ClassValue } from 'svelte/elements'

  let {
    note,
    class: className = 'bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-200',
  }: { note: string; class?: ClassValue } = $props()
</script>

{#if note}
  <span class={['inline-block max-w-full truncate rounded-full px-2 py-0.5 align-middle text-xs font-bold', className]}>
    {note}
  </span>
{/if}
