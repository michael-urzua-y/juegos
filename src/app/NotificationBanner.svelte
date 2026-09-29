<script lang="ts">
  import { notifications, requestNotificationPermission } from '@/shared/platform/notifications.svelte'
  import Icon from '@/shared/ui/Icon.svelte'
</script>

{#if notifications.supported && notifications.permission !== 'granted'}
  <div
    class="mb-4 flex items-start gap-3 rounded-2xl bg-amber-100 p-4 text-sm text-amber-900 dark:bg-amber-950 dark:text-amber-200"
    role="note"
  >
    <Icon name="bell" class="mt-0.5 size-5 shrink-0" />
    <div class="flex-1">
      <p class="font-bold">Activa las notificaciones</p>
      {#if notifications.permission === 'denied'}
        <p class="mt-1">
          Están bloqueadas. Sin ellas el celular no vibra con la pantalla bloqueada. Actívalas en Chrome: ⋮ →
          Configuración → Configuración de sitios → Notificaciones.
        </p>
      {:else}
        <p class="mt-1">Así el celular vibra y avisa aunque la pantalla esté bloqueada.</p>
        <button
          type="button"
          class="mt-3 h-10 rounded-xl bg-amber-500 px-4 font-bold text-white active:scale-95"
          onclick={requestNotificationPermission}
        >
          Activar
        </button>
      {/if}
    </div>
  </div>
{/if}
