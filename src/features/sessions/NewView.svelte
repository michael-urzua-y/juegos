<script lang="ts">
  import { clock } from '@/shared/lib/clock.svelte'
  import { plural } from '@/shared/lib/format'
  import Icon from '@/shared/ui/Icon.svelte'
  import SectionTitle from '@/shared/ui/SectionTitle.svelte'
  import NewSessionForm from './components/NewSessionForm.svelte'
  import SessionList from './components/SessionList.svelte'
  import { activeSessions, endingSoonSessions } from './store.svelte'

  let { onShowAll }: { onShowAll: () => void } = $props()

  const activeCount = $derived(activeSessions().length)
  // Aparecen solos al entrar al último minuto; el resto está en "Activos".
  const ending = $derived(endingSoonSessions(clock.now))
</script>

<div class="space-y-4">
  <NewSessionForm />

  {#if ending.length}
    <div class="flex items-center justify-between px-1 pt-2">
      <SectionTitle class="mb-0 text-amber-600! dark:text-amber-400!">Por terminar</SectionTitle>
      <button type="button" class="flex items-center text-sm font-bold text-orange-600" onclick={onShowAll}>
        Ver los {activeCount}<Icon name="chevronRight" class="size-4" />
      </button>
    </div>
    <SessionList items={ending} />
  {:else if activeCount}
    <button
      type="button"
      class="card flex w-full items-center gap-3 text-left text-sm font-semibold text-zinc-500 dark:text-zinc-400"
      onclick={onShowAll}
    >
      <Icon name="timer" class="size-5 shrink-0 text-emerald-500" />
      <span class="flex-1">{plural(activeCount, 'niño jugando', 'niños jugando')} · ninguno por terminar</span>
      <Icon name="chevronRight" class="size-5 shrink-0 text-zinc-300 dark:text-zinc-600" />
    </button>
  {/if}
</div>
