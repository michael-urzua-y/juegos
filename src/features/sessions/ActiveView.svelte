<script lang="ts">
  import { plural } from '@/shared/lib/format'
  import { foldText } from '@/shared/lib/sanitize'
  import Icon from '@/shared/ui/Icon.svelte'
  import SessionList from './components/SessionList.svelte'
  import { activeSessions } from './store.svelte'

  /** Desde cuántos niños se muestra el buscador. */
  const SEARCH_FROM = 6

  let { onAdd }: { onAdd: () => void } = $props()

  let query = $state('')
  let game = $state('')

  const active = $derived(activeSessions())
  const games = $derived([...new Set(active.map((s) => s.game).filter(Boolean))].sort())
  const filtered = $derived(
    active.filter(
      (s) => (!game || s.game === game) && (!query || foldText(`${s.name} ${s.note}`).includes(foldText(query))),
    ),
  )
  const count = (status: string) => active.filter((s) => s.status === status).length

  // Si el juego filtrado ya no tiene niños, se quita el filtro.
  $effect(() => {
    if (game && !games.includes(game)) game = ''
  })
</script>

{#if active.length === 0}
  <div class="py-16 text-center text-zinc-400">
    <Icon name="users" class="mx-auto size-12 opacity-50" />
    <p class="mt-2 font-semibold">No hay niños jugando</p>
    <button type="button" class="chip chip-on mx-auto mt-4 h-12 gap-2 px-5" onclick={onAdd}>
      <Icon name="userPlus" />Agregar niño
    </button>
  </div>
{:else}
  <div class="space-y-3">
    <div class="flex gap-2 text-sm font-bold">
      <span class="rounded-full bg-emerald-100 px-3 py-1 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
        {count('running')} jugando
      </span>
      {#if count('paused')}
        <span class="rounded-full bg-zinc-200 px-3 py-1 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
          {count('paused')} en pausa
        </span>
      {/if}
      {#if count('alarm')}
        <span class="rounded-full bg-red-100 px-3 py-1 text-red-700 dark:bg-red-950 dark:text-red-300">
          {plural(count('alarm'), 'terminó', 'terminaron')}
        </span>
      {/if}
    </div>

    {#if active.length >= SEARCH_FROM}
      <label class="relative block">
        <Icon name="search" class="pointer-events-none absolute top-3.5 left-4 size-5 text-zinc-400" />
        <input
          class="field bg-white pl-11 dark:bg-zinc-900"
          type="search"
          placeholder="Buscar por nombre o nota"
          bind:value={query}
        />
      </label>
    {/if}

    {#if games.length > 1}
      <div class="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1" role="group" aria-label="Filtrar por juego">
        {#each ['', ...games] as g (g)}
          <button
            type="button"
            class={['chip h-9 shrink-0 px-4 text-sm', game === g && 'chip-on']}
            aria-pressed={game === g}
            onclick={() => (game = g)}
          >
            {g || 'Todos'}
          </button>
        {/each}
      </div>
    {/if}

    {#if filtered.length}
      <SessionList items={filtered} />
    {:else}
      <p class="py-8 text-center text-zinc-400">Sin resultados.</p>
    {/if}
  </div>
{/if}
