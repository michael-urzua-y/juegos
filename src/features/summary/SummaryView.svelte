<script lang="ts">
  import { clearHistory, removeSession, sessions, StatusBadge, type Session } from '@/features/sessions'
  import { clock } from '@/shared/lib/clock.svelte'
  import { formatClock, formatMoney } from '@/shared/lib/format'
  import Icon from '@/shared/ui/Icon.svelte'
  import IconButton from '@/shared/ui/IconButton.svelte'
  import SectionTitle from '@/shared/ui/SectionTitle.svelte'
  import SegmentedControl from '@/shared/ui/SegmentedControl.svelte'
  import { RANGES, rangeBounds, summarize, type RangeId } from './stats'

  let { onRepeat }: { onRepeat: (s: Session) => void } = $props()

  let range: RangeId = $state('today')
  const summary = $derived(summarize(sessions, rangeBounds(range, clock.now)))
  const maxAmount = $derived(Math.max(1, ...summary.byGame.map((g) => g.amount)))
  const hasHistory = $derived(sessions.some((s) => s.status === 'done'))

  function onRemove(s: Session) {
    if (confirm(`¿Eliminar el turno de ${s.name}?`)) removeSession(s.id)
  }
  function onClear() {
    if (confirm('¿Borrar todo el historial? Los turnos en curso se mantienen.')) clearHistory()
  }
</script>

<section class="space-y-4">
  <SegmentedControl bind:value={range} options={RANGES} label="Período" />

  <div class="card bg-linear-to-br from-orange-500 to-amber-500 text-white ring-0!">
    <p class="text-sm font-semibold opacity-90">Recaudado</p>
    <p class="text-5xl font-black tabular-nums">{formatMoney(summary.total)}</p>
    <div class="mt-3 flex gap-6 text-sm font-semibold">
      <p><span class="text-2xl font-black">{summary.sessions.length}</span> turnos</p>
      <p><span class="text-2xl font-black">{summary.minutes}</span> minutos</p>
    </div>
  </div>

  {#if summary.byGame.length > 1}
    <div class="card space-y-3">
      <SectionTitle class="mb-0">Por juego</SectionTitle>
      {#each summary.byGame as g (g.game)}
        <div>
          <div class="flex justify-between text-sm font-semibold">
            <span>{g.game} <span class="text-zinc-400">· {g.count}</span></span>
            <span class="tabular-nums">{formatMoney(g.amount)}</span>
          </div>
          <div class="mt-1 h-2 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
            <div class="h-full rounded-full bg-orange-500" style:width="{(g.amount / maxAmount) * 100}%"></div>
          </div>
        </div>
      {/each}
    </div>
  {/if}

  <div class="card p-0!">
    {#if summary.sessions.length === 0}
      <p class="p-8 text-center text-zinc-400">Sin turnos en este período.</p>
    {:else}
      <ul class="divide-y divide-zinc-100 dark:divide-zinc-800">
        {#each summary.sessions as s (s.id)}
          <li class="flex items-center gap-3 py-3 pr-2 pl-4">
            <span class="w-11 shrink-0 text-sm font-semibold text-zinc-400 tabular-nums"
              >{formatClock(s.startedAt)}</span
            >
            <div class="min-w-0 flex-1">
              <p class="flex items-center gap-2 truncate font-bold">
                {s.name}
                {#if s.status !== 'done'}<StatusBadge status={s.status} />{/if}
              </p>
              <p class="truncate text-sm text-zinc-500">
                {s.game ? `${s.game} · ` : ''}{s.minutes} min{s.price ? ` · ${formatMoney(s.price)}` : ''}
              </p>
            </div>
            <IconButton
              icon="repeat"
              label="Repetir turno de {s.name}"
              onclick={() => onRepeat(s)}
              class="text-orange-600"
            />
            <IconButton icon="trash" label="Eliminar turno de {s.name}" onclick={() => onRemove(s)} />
          </li>
        {/each}
      </ul>
    {/if}
  </div>

  {#if hasHistory}
    <button
      type="button"
      class="mx-auto flex items-center gap-2 py-2 text-sm font-semibold text-zinc-400"
      onclick={onClear}
    >
      <Icon name="trash" class="size-4" />Borrar historial
    </button>
  {/if}
</section>
