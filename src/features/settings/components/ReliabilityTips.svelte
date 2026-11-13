<script lang="ts">
  import { isNative } from '@/shared/platform/native'
  import { notifications, requestNotificationPermission } from '@/shared/platform/notifications.svelte'
  import { wakeLock } from '@/shared/platform/wakelock.svelte'
  import Icon, { type IconName } from '@/shared/ui/Icon.svelte'
  import SectionTitle from '@/shared/ui/SectionTitle.svelte'

  type Tip = { icon: IconName; color: string; text: string }

  // App Android: la alarma está agendada en el sistema y suena con la app cerrada, siempre que
  // Android no la frene por ahorro de batería y tenga permiso para notificar.
  const nativeTips: Tip[] = [
    {
      icon: 'alert',
      color: 'text-amber-500',
      text: 'Ahorro de batería en "Sin restricciones": mantén presionado el ícono de la app → Información de la app → Ahorro de batería.',
    },
    {
      icon: 'bell',
      color: 'text-orange-500',
      text: 'Notificaciones activadas: así la alarma suena aunque cierres la app o bloquees el celular.',
    },
    {
      icon: 'volume',
      color: 'text-orange-500',
      text: 'Sube el volumen de notificaciones y el multimedia del celular.',
    },
  ]

  const webTips: Tip[] = $derived([
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
  const tips = $derived(isNative ? nativeTips : webTips)
</script>

<div class="card space-y-3 text-sm">
  <SectionTitle class="mb-0">Para que la alarma no falle</SectionTitle>
  {#each tips as tip (tip.text)}
    <p class="flex gap-2"><Icon name={tip.icon} class={['size-5 shrink-0', tip.color]} />{tip.text}</p>
  {/each}
  <div class="flex items-center justify-between gap-3 border-t border-zinc-100 pt-3 dark:border-zinc-800">
    <span class="flex gap-2"
      ><Icon name="bell" class="size-5 shrink-0 text-zinc-400" />{isNative
        ? 'Notificaciones'
        : 'Notificaciones de respaldo'}</span
    >
    {#if notifications.permission === 'granted'}
      <span class="font-bold text-emerald-600">Activadas</span>
    {:else if notifications.permission === 'denied'}
      <span class="font-bold text-zinc-400">Bloqueadas</span>
    {:else}
      <button type="button" class="chip h-9 px-3 text-sm" onclick={requestNotificationPermission}>Activar</button>
    {/if}
  </div>
</div>
