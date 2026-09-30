<script lang="ts">
  import { formatLongDate } from '@/shared/lib/format'
  import { dayKeyToDate } from '@/shared/lib/time'
  import Icon from '@/shared/ui/Icon.svelte'
  import AuthLayout from './components/AuthLayout.svelte'
  import SupportLink from './components/SupportLink.svelte'
  import { auth } from './store.svelte'

  let { onSignOut }: { onSignOut: () => void } = $props()

  const me = $derived(auth.me)
  const suspended = $derived(me?.user.status === 'suspended')
</script>

{#if me}
  <AuthLayout>
    <div class="space-y-4 rounded-3xl bg-white/8 p-6 text-center ring-1 ring-white/10">
      <Icon name="ban" class="mx-auto size-12 text-red-400" />
      <h1 class="text-2xl font-black">{suspended ? 'Cuenta suspendida' : 'Suscripción vencida'}</h1>
      <p class="text-white/70">
        {#if suspended}
          Tu cuenta fue suspendida.
        {:else if me.user.paidUntil}
          Tu suscripción venció el {formatLongDate(dayKeyToDate(me.user.paidUntil)).toLowerCase()}.
        {:else}
          Tu suscripción no está activa.
        {/if}
        Tus datos están guardados y vuelven a estar disponibles al renovar.
      </p>
      <SupportLink
        contact={me.supportContact}
        message="Hola, quiero renovar mi suscripción de Turnos ({me.user.username})."
      />
    </div>
    <button
      type="button"
      class="mx-auto mt-6 flex items-center gap-2 py-2 text-sm font-semibold text-white/50"
      onclick={onSignOut}
    >
      <Icon name="logOut" class="size-4" />Cerrar sesión
    </button>
  </AuthLayout>
{/if}
