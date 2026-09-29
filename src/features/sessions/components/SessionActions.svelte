<script lang="ts">
  import { settings } from '@/features/settings'
  import Icon from '@/shared/ui/Icon.svelte'
  import type { Session } from '../model'
  import { extend, finish, pause, resume } from '../store.svelte'

  let { s }: { s: Session } = $props()

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

  const button = 'chip h-12 gap-1 text-base'
</script>

<div class="grid grid-cols-3 gap-2">
  <button
    type="button"
    class={button}
    onclick={() => extend(s.id)}
    aria-label="Agregar {settings.extendMinutes} minutos a {s.name}"
  >
    <Icon name="plus" />{settings.extendMinutes} min
  </button>

  {#if s.status === 'paused'}
    <button type="button" class={button} onclick={() => resume(s.id)}>
      <Icon name="play" class="size-5 fill-current" />Seguir
    </button>
  {:else if s.status === 'running'}
    <button type="button" class={button} onclick={() => pause(s.id)}><Icon name="pause" />Pausa</button>
  {:else}
    <div></div>
  {/if}

  {#if s.status === 'alarm'}
    <button type="button" class={[button, 'bg-red-600! text-white!']} onclick={() => finish(s.id)}>
      <Icon name="check" />Listo
    </button>
  {:else}
    <button type="button" class={[button, confirming && 'bg-red-600! text-white!']} onclick={onStop}>
      {#if confirming}¿Seguro?{:else}<Icon name="stop" />Terminar{/if}
    </button>
  {/if}
</div>
