<script lang="ts">
  import { auth, ChangePasswordForm, subscriptionBadge, SubscriptionPill, SupportLink } from '@/features/auth'
  import { syncState } from '@/features/sync'
  import { clock } from '@/shared/lib/clock.svelte'
  import { formatClock, formatLongDate } from '@/shared/lib/format'
  import { dayKey, dayKeyToDate } from '@/shared/lib/time'
  import Icon from '@/shared/ui/Icon.svelte'
  import SectionTitle from '@/shared/ui/SectionTitle.svelte'
  import { toast } from '@/shared/ui/toast.svelte'
  import { confirmSignOut, updatePassword } from './account.svelte'

  const me = $derived(auth.me)
  const badge = $derived(me ? subscriptionBadge(me.user, dayKey(clock.now)) : null)
  let changing = $state(false)
  let leaving = $state(false)

  const syncText = $derived.by(() => {
    switch (syncState.status) {
      case 'saving':
        return 'Guardando…'
      case 'offline':
        return 'Sin conexión: tus cambios se guardarán al reconectar'
      case 'error':
        return 'No se pudieron guardar los últimos cambios'
      default:
        return syncState.lastSyncedAt
          ? `Guardado a las ${formatClock(syncState.lastSyncedAt)}`
          : 'Tus datos están al día'
    }
  })

  async function onPassword(current: string, next: string) {
    await updatePassword(current, next)
    changing = false
    toast('Clave actualizada')
  }

  async function onSignOut() {
    leaving = true
    try {
      await confirmSignOut()
    } finally {
      leaving = false
    }
  }
</script>

{#if me && badge}
  <section class="space-y-4">
    <div class="card flex items-center gap-4">
      <span class="grid size-14 shrink-0 place-items-center rounded-2xl bg-orange-500 text-2xl font-black text-white">
        {me.user.displayName.charAt(0).toUpperCase()}
      </span>
      <div class="min-w-0 flex-1">
        <p class="truncate text-lg font-black">{me.user.displayName}</p>
        <p class="truncate font-mono text-sm text-zinc-500">{me.user.username}</p>
      </div>
      <SubscriptionPill {badge} />
    </div>

    {#if me.user.role === 'client'}
      <div class="card space-y-3">
        <SectionTitle class="mb-0">Suscripción</SectionTitle>
        <p class="text-sm">
          Vence el <b>{me.user.paidUntil ? formatLongDate(dayKeyToDate(me.user.paidUntil)).toLowerCase() : '—'}</b>.
        </p>
        <SupportLink
          contact={me.supportContact}
          message="Hola, quiero renovar mi suscripción de Turnos ({me.user.username})."
        />
      </div>
    {/if}

    <div class="card flex items-center gap-3 text-sm">
      <Icon
        name={syncState.status === 'offline' || syncState.status === 'error' ? 'cloudOff' : 'cloud'}
        class={['size-6 shrink-0', syncState.status === 'error' ? 'text-red-500' : 'text-sky-500']}
      />
      <div>
        <p class="font-bold">Respaldo en la nube</p>
        <p class="text-zinc-500">{syncText}</p>
      </div>
    </div>

    <div class="card">
      {#if changing}
        <SectionTitle>Cambiar clave</SectionTitle>
        <ChangePasswordForm onSubmit={onPassword} onCancel={() => (changing = false)} />
      {:else}
        <button
          type="button"
          class="flex w-full items-center gap-3 text-left font-bold"
          onclick={() => (changing = true)}
        >
          <Icon name="key" class="text-orange-500" />Cambiar clave
        </button>
      {/if}
    </div>

    <button
      type="button"
      class="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-zinc-200 font-bold text-red-600 active:scale-[0.98] disabled:opacity-50 dark:bg-zinc-800 dark:text-red-400"
      disabled={leaving}
      onclick={onSignOut}
    >
      <Icon name="logOut" />{leaving ? 'Cerrando…' : 'Cerrar sesión en este dispositivo'}
    </button>
    <p class="px-2 text-center text-xs text-zinc-400">
      Tu cuenta solo puede estar abierta en un dispositivo. Cierra sesión aquí antes de usarla en otro.
    </p>
  </section>
{/if}
