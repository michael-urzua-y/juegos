<script lang="ts">
  import Icon from '@/shared/ui/Icon.svelte'
  import SectionTitle from '@/shared/ui/SectionTitle.svelte'
  import NewSessionForm from './components/NewSessionForm.svelte'
  import SessionCard from './components/SessionCard.svelte'
  import { activeSessions } from './store.svelte'

  const active = $derived(activeSessions())
</script>

<div class="space-y-4">
  <NewSessionForm />
  {#if active.length}
    <SectionTitle class="px-1 pt-2">Jugando ahora · {active.length}</SectionTitle>
    {#each active as s (s.id)}
      <SessionCard {s} />
    {/each}
  {:else}
    <div class="py-10 text-center text-zinc-400">
      <Icon name="timer" class="mx-auto size-12 opacity-50" />
      <p class="mt-2 font-semibold">No hay niños jugando</p>
      <p class="text-sm">Escribe un nombre, elige el tiempo y presiona Iniciar.</p>
    </div>
  {/if}
</div>
