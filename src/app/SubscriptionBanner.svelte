<script lang="ts">
  import { auth, subscriptionBadge, SupportLink } from '@/features/auth'
  import { clock } from '@/shared/lib/clock.svelte'
  import { dayKey } from '@/shared/lib/time'
  import Icon from '@/shared/ui/Icon.svelte'

  // Aviso a clientes cuya suscripción vence pronto o está en días de gracia.
  const me = $derived(auth.me)
  const badge = $derived(me && me.user.role === 'client' ? subscriptionBadge(me.user, dayKey(clock.now)) : null)
</script>

{#if me && badge?.tone === 'warn'}
  <div
    class="mb-4 space-y-3 rounded-2xl bg-amber-100 p-4 text-sm text-amber-900 dark:bg-amber-950 dark:text-amber-200"
    role="note"
  >
    <p class="flex items-center gap-2 font-bold">
      <Icon name="alert" class="size-5 shrink-0" />Tu suscripción: {badge.label.toLowerCase()}
    </p>
    <SupportLink
      contact={me.supportContact}
      message="Hola, quiero renovar mi suscripción de Turnos ({me.user.username})."
    />
  </div>
{/if}
