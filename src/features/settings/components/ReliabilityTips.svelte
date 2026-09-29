<script lang="ts">
  import { notifications, requestNotificationPermission } from '@/shared/platform/notifications.svelte'
  import { wakeLock } from '@/shared/platform/wakelock.svelte'
  import Icon, { type IconName } from '@/shared/ui/Icon.svelte'
  import SectionTitle from '@/shared/ui/SectionTitle.svelte'

  const tips: { icon: IconName; color: string; text: string }[] = $derived([
    wakeLock.supported
      ? {
          icon: 'sun',
          color: 'text-emerald-500',
          text: 'La pantalla se mantiene encendida sola mientras haya niños jugando.',
        }
      : {
          icon: 'alert',
          color: 'text-amber-500',
          text: 'Este navegador no puede mantener la pantalla encendida: sube el tiempo de bloqueo en los ajustes del celular.',
        },
    {
      icon: 'alert',
      color: 'text-amber-500',
      text: 'Deja la app abierta. Si cambias a otra app, la alarma puede sonar recién al volver.',
    },
    { icon: 'volume', color: 'text-orange-500', text: 'Sube el volumen multimedia del celular (no el del timbre).' },
  ])
</script>

<div class="card space-y-3 text-sm">
  <SectionTitle class="mb-0">Para que la alarma no falle</SectionTitle>
  {#each tips as tip (tip.text)}
    <p class="flex gap-2"><Icon name={tip.icon} class={['size-5 shrink-0', tip.color]} />{tip.text}</p>
  {/each}
  <div class="flex items-center justify-between gap-3 border-t border-zinc-100 pt-3 dark:border-zinc-800">
    <span class="flex gap-2"><Icon name="bell" class="size-5 shrink-0 text-zinc-400" />Notificaciones de respaldo</span>
    {#if notifications.permission === 'granted'}
      <span class="font-bold text-emerald-600">Activadas</span>
    {:else if notifications.permission === 'denied'}
      <span class="font-bold text-zinc-400">Bloqueadas</span>
    {:else}
      <button type="button" class="chip h-9 px-3 text-sm" onclick={requestNotificationPermission}>Activar</button>
    {/if}
  </div>
</div>
