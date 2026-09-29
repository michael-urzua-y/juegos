<script lang="ts">
  import type { Session } from '../model'
  import SessionRow from './SessionRow.svelte'

  let { items }: { items: readonly Session[] } = $props()

  // Solo una fila abierta a la vez, para que la lista siga siendo compacta.
  let expandedId: string | null = $state(null)
</script>

<ul class="card divide-y divide-zinc-100 overflow-hidden p-0! dark:divide-zinc-800">
  {#each items as s (s.id)}
    <SessionRow {s} expanded={expandedId === s.id} onToggle={() => (expandedId = expandedId === s.id ? null : s.id)} />
  {/each}
</ul>
