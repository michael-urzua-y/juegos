<script lang="ts">
  import { settings, warnThresholdMs } from '@/features/settings'
  import { clock } from '@/shared/lib/clock.svelte'
  import { formatClock, formatDuration, formatMoney } from '@/shared/lib/format'
  import Icon from '@/shared/ui/Icon.svelte'
  import { progress, remainingMs, sessionTone, type Session } from '../model'
  import { extend, finish, pause, resume } from '../store.svelte'
  import { TONE_STYLES } from '../tone'
  import StatusBadge from './StatusBadge.svelte'

  let { s }: { s: Session } = $props()

  const left = $derived(remainingMs(s, clock.now))
  const tone = $derived(sessionTone(s, clock.now, warnThresholdMs()))
  const style = $derived(TONE_STYLES[tone])

  // "Terminar" pide un segundo toque para evitar cortes accidentales.
  let confirming = $state(false)
  let confirmTimer: ReturnType<typeof setTimeout> | undefined
  function onStop() {
    clearTimeout(confirmTimer)
    if (confirming) return finish(s.id)
    confirming = true
    confirmTimer = setTimeout(() => (confirming = false), 3000)
  }
  $effect(() => () => clearTimeout(confirmTimer))
</script>

<article class={['card animate-pop', style.ring]}>
  <div class="flex items-start justify-between gap-3">
    <div class="min-w-0">
      <h3 class="truncate text-2xl font-black">{s.name}</h3>
      <p class="mt-0.5 truncate text-sm text-zinc-500 dark:text-zinc-400">
        {#if s.game}<span class="font-semibold text-zinc-700 dark:text-zinc-300">{s.game}</span> ·{/if}
        {formatClock(s.startedAt)} · {s.minutes} min{#if s.price > 0}&nbsp;· {formatMoney(s.price)}{/if}
      </p>
    </div>
    <div class="shrink-0 text-right">
      {#if s.status === 'alarm'}
        <p class={['text-2xl font-black', style.text]}>¡TIEMPO!</p>
        <p class="text-sm font-semibold text-red-500 tabular-nums">+{formatDuration(-left)}</p>
      {:else}
        <p class={['text-4xl leading-none font-black tabular-nums', style.text]}>{formatDuration(left)}</p>
        <p class="mt-1 text-xs text-zinc-400">
          {#if s.status === 'paused'}<StatusBadge status={s.status} />{:else}sale {formatClock(s.endsAt)}{/if}
        </p>
      {/if}
    </div>
  </div>

  <div class="mt-3 h-3 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
    <div
      class={['h-full rounded-full transition-[width] duration-300 ease-linear', style.bar]}
      style:width="{progress(s, clock.now) * 100}%"
    ></div>
  </div>

  <div class="mt-3 grid grid-cols-3 gap-2">
    <button
      type="button"
      class="chip h-12 gap-1 text-base"
      onclick={() => extend(s.id)}
      aria-label="Agregar {settings.extendMinutes} minutos a {s.name}"
    >
      <Icon name="plus" />{settings.extendMinutes} min
    </button>

    {#if s.status === 'paused'}
      <button type="button" class="chip h-12 gap-1 text-base" onclick={() => resume(s.id)}>
        <Icon name="play" class="size-5 fill-current" />Seguir
      </button>
    {:else if s.status === 'running'}
      <button type="button" class="chip h-12 gap-1 text-base" onclick={() => pause(s.id)}>
        <Icon name="pause" />Pausa
      </button>
    {:else}
      <div></div>
    {/if}

    {#if s.status === 'alarm'}
      <button type="button" class="chip h-12 gap-1 bg-red-600! text-base text-white!" onclick={() => finish(s.id)}>
        <Icon name="check" />Listo
      </button>
    {:else}
      <button
        type="button"
        class={['chip h-12 gap-1 text-base', confirming && 'bg-red-600! text-white!']}
        onclick={onStop}
      >
        {#if confirming}¿Seguro?{:else}<Icon name="stop" />Terminar{/if}
      </button>
    {/if}
  </div>
</article>
