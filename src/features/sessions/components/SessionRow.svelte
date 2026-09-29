<script lang="ts">
  import { warnThresholdMs } from '@/features/settings'
  import { clock } from '@/shared/lib/clock.svelte'
  import { formatClock, formatDuration } from '@/shared/lib/format'
  import { progress, remainingMs, sessionTone, type Session } from '../model'
  import { TONE_STYLES } from '../tone'
  import NoteTag from './NoteTag.svelte'
  import SessionActions from './SessionActions.svelte'

  let { s, expanded, onToggle }: { s: Session; expanded: boolean; onToggle: () => void } = $props()

  const left = $derived(remainingMs(s, clock.now))
  const tone = $derived(sessionTone(s, clock.now, warnThresholdMs()))
  const style = $derived(TONE_STYLES[tone])
  const detail = $derived(
    s.status === 'paused'
      ? 'En pausa'
      : s.status === 'alarm'
        ? '¡Se acabó el tiempo!'
        : `sale ${formatClock(s.endsAt)}`,
  )
</script>

<li class={[tone === 'alarm' && 'bg-red-50 dark:bg-red-950/40']}>
  <button
    type="button"
    class="flex w-full items-center gap-3 px-4 pt-3 pb-2 text-left"
    aria-expanded={expanded}
    onclick={onToggle}
  >
    <span class={['size-2.5 shrink-0 rounded-full', style.bar, tone === 'alarm' && 'animate-ping']}></span>
    <span class="min-w-0 flex-1">
      <span class="flex min-w-0 items-center gap-2">
        <span class="truncate text-lg leading-tight font-black">{s.name}</span>
        <NoteTag note={s.note} />
      </span>
      <span class="block truncate text-xs text-zinc-500 dark:text-zinc-400">
        {s.game ? `${s.game} · ` : ''}{detail}
      </span>
    </span>
    <span class={['shrink-0 text-2xl font-black tabular-nums', style.text]}>
      {tone === 'alarm' ? `+${formatDuration(-left)}` : formatDuration(left)}
    </span>
  </button>
  <div class="mx-4 mb-3 h-1.5 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
    <div
      class={['h-full rounded-full transition-[width] duration-300 ease-linear', style.bar]}
      style:width="{progress(s, clock.now) * 100}%"
    ></div>
  </div>
  {#if expanded}
    <div class="animate-pop px-4 pb-3"><SessionActions {s} /></div>
  {/if}
</li>
