<script lang="ts">
  import { displayName, NoteTag, removeSession, type Session } from '@/features/sessions'
  import { clock } from '@/shared/lib/clock.svelte'
  import { formatClock, formatLongDate, formatMoney, plural } from '@/shared/lib/format'
  import { dayKey, dayKeyToDate } from '@/shared/lib/time'
  import Calendar from '@/shared/ui/Calendar.svelte'
  import Icon from '@/shared/ui/Icon.svelte'
  import IconButton from '@/shared/ui/IconButton.svelte'
  import SectionTitle from '@/shared/ui/SectionTitle.svelte'
  import { daysWithData, inPlay, isArchived, sessionsOfDay, statsOfDay } from './store.svelte'

  let { onRepeat }: { onRepeat: (s: Session) => void } = $props()

  const today = $derived(dayKey(clock.now))
  let selected = $state(dayKey(Date.now()))

  const stats = $derived(statsOfDay(selected))
  const detail = $derived(sessionsOfDay(selected))
  const maxAmount = $derived(Math.max(1, ...stats.byGame.map((g) => g.amount)))
  const label = $derived(selected === today ? 'Hoy' : formatLongDate(dayKeyToDate(selected)))
  const playing = $derived(inPlay())

  function onRemove(s: Session) {
    if (confirm(`¿Eliminar el turno de ${displayName(s)}? Se descontará de la caja.`)) removeSession(s.id)
  }
</script>

<section class="space-y-4">
  <div class="card">
    <Calendar bind:selected max={today} marked={daysWithData()} />
  </div>

  <div class="card bg-linear-to-br from-orange-500 to-amber-500 text-white ring-0!">
    <div class="flex items-center justify-between gap-2">
      <p class="truncate text-sm font-bold opacity-90">{label}</p>
      {#if selected !== today}
        <button
          type="button"
          class="shrink-0 rounded-full bg-white/20 px-3 py-1 text-xs font-bold"
          onclick={() => (selected = today)}
        >
          Ir a hoy
        </button>
      {/if}
    </div>
    <p class="mt-1 text-5xl font-black tabular-nums">{formatMoney(stats.total)}</p>
    <div class="mt-4 grid grid-cols-3 gap-2 text-center">
      {#each [{ n: stats.kids, t: stats.kids === 1 ? 'niño' : 'niños' }, { n: stats.sessions, t: stats.sessions === 1 ? 'turno' : 'turnos' }, { n: stats.minutes, t: 'minutos' }] as m (m.t)}
        <div class="rounded-2xl bg-white/15 py-2">
          <p class="text-2xl font-black tabular-nums">{m.n}</p>
          <p class="text-xs font-semibold opacity-90">{m.t}</p>
        </div>
      {/each}
    </div>
  </div>

  {#if selected === today && playing.count}
    <p
      class="flex items-center gap-2 rounded-2xl bg-emerald-100 px-4 py-3 text-sm font-semibold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
    >
      <Icon name="timer" class="size-5 shrink-0" />
      {plural(playing.count, 'niño jugando', 'niños jugando')} ahora · {formatMoney(playing.amount)} se sumarán al terminar
    </p>
  {/if}

  {#if stats.byGame.length}
    <div class="card space-y-3">
      <SectionTitle class="mb-0">Por juego</SectionTitle>
      {#each stats.byGame as g (g.game)}
        <div>
          <div class="flex justify-between text-sm font-semibold">
            <span>{g.game} <span class="text-zinc-400">· {plural(g.count, 'turno', 'turnos')}</span></span>
            <span class="tabular-nums">{formatMoney(g.amount)}</span>
          </div>
          <div class="mt-1 h-2 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
            <div class="h-full rounded-full bg-orange-500" style:width="{(g.amount / maxAmount) * 100}%"></div>
          </div>
        </div>
      {/each}
    </div>
  {/if}

  {#if detail.length}
    <div>
      <SectionTitle class="mb-2 px-1">Turnos terminados</SectionTitle>
      <ul class="card divide-y divide-zinc-100 p-0! dark:divide-zinc-800">
        {#each detail as s (s.id)}
          <li class="flex items-center gap-3 py-3 pr-2 pl-4">
            <span class="w-11 shrink-0 text-sm font-semibold text-zinc-400 tabular-nums">
              {formatClock(s.startedAt)}
            </span>
            <div class="min-w-0 flex-1">
              <p class="flex min-w-0 items-center gap-2">
                <span class="truncate font-bold">{s.name}</span>
                <NoteTag note={s.note} />
              </p>
              <p class="truncate text-sm text-zinc-500">
                {s.game ? `${s.game} · ` : ''}{s.minutes} min{s.price ? ` · ${formatMoney(s.price)}` : ''}
              </p>
            </div>
            {#if selected === today}
              <button
                type="button"
                class="flex h-9 shrink-0 items-center gap-1 rounded-xl bg-orange-100 px-3 text-sm font-bold text-orange-700 active:scale-95 dark:bg-orange-950 dark:text-orange-300"
                aria-label="Repetir turno de {s.name}"
                onclick={() => onRepeat(s)}
              >
                <Icon name="repeat" class="size-4" />Repetir
              </button>
            {/if}
            <IconButton icon="trash" label="Eliminar turno de {s.name}" onclick={() => onRemove(s)} />
          </li>
        {/each}
      </ul>
    </div>
  {:else if stats.sessions}
    <p class="px-4 text-center text-sm text-zinc-400">
      {#if isArchived(selected)}El detalle de este día ya no se guarda; se conservan los totales.{/if}
    </p>
  {:else}
    <div class="py-6 text-center text-zinc-400">
      <Icon name="calendar" class="mx-auto size-10 opacity-50" />
      <p class="mt-2 font-semibold">Sin turnos terminados este día</p>
    </div>
  {/if}
</section>
