<script lang="ts">
  import { ApiError } from '@/shared/lib/api'
  import { formatClock, formatLongDate } from '@/shared/lib/format'
  import { dayKeyToDate } from '@/shared/lib/time'
  import Icon from '@/shared/ui/Icon.svelte'
  import { SALES_MESSAGE, SALES_WHATSAPP } from '@/shared/config'
  import { installPrompt, promptInstall } from '@/shared/platform/install.svelte'
  import PasswordField from '@/shared/ui/PasswordField.svelte'
  import AuthLayout from './components/AuthLayout.svelte'
  import SupportLink from './components/SupportLink.svelte'
  import { whatsappLink } from './subscription'

  let { onSubmit }: { onSubmit: (username: string, password: string) => Promise<void> } = $props()

  let username = $state('')
  let password = $state('')
  let busy = $state(false)
  let error = $state<ApiError | null>(null)

  const field = 'field h-14 bg-white/8 text-white ring-orange-500 placeholder:text-white/40'

  async function submit(e: SubmitEvent) {
    e.preventDefault()
    if (busy || !username.trim() || !password) return
    busy = true
    error = null
    try {
      await onSubmit(username.trim(), password)
    } catch (err) {
      error = err instanceof ApiError ? err : new ApiError(0, 'unknown', 'No se pudo iniciar sesión.')
      if (error.code === 'invalid_credentials') password = ''
    } finally {
      busy = false
    }
  }

  // Datos extra que manda el servidor según el error
  const device = $derived(error?.body.device as { name: string; lastSeenAt: number } | undefined)
  const support = $derived(typeof error?.body.supportContact === 'string' ? error.body.supportContact : '')
  const paidUntil = $derived(typeof error?.body.paidUntil === 'string' ? error.body.paidUntil : '')
</script>

<AuthLayout subtitle="Control de turnos para juegos">
  <form class="space-y-3" onsubmit={submit} novalidate>
    <label class="block">
      <span class="sr-only">Usuario</span>
      <input
        bind:value={username}
        class={field}
        placeholder="Usuario"
        autocomplete="username"
        autocapitalize="off"
        spellcheck="false"
        enterkeyhint="next"
        maxlength="40"
      />
    </label>
    <PasswordField bind:value={password} label="Clave" class={field} enterkeyhint="go" maxlength={128} />

    {#if error}
      <div class="animate-pop space-y-3 rounded-2xl bg-white/8 p-4 text-sm ring-1 ring-white/10" role="alert">
        {#if error.code === 'active_elsewhere' && device}
          <p class="flex items-start gap-2 font-semibold text-amber-300">
            <Icon name="smartphone" class="mt-0.5 size-5 shrink-0" />
            Tu cuenta está abierta en otro dispositivo ({device.name}, usado por última vez
            {formatLongDate(new Date(device.lastSeenAt)).toLowerCase()} a las {formatClock(device.lastSeenAt)}).
          </p>
          <p class="text-white/70">Cierra sesión en ese dispositivo desde Admin → Mi cuenta, o pide que lo liberen.</p>
        {:else if error.code === 'suspended' || error.code === 'expired'}
          <p class="flex items-start gap-2 font-semibold text-red-300">
            <Icon name="ban" class="mt-0.5 size-5 shrink-0" />
            {error.code === 'suspended'
              ? 'Tu cuenta está suspendida.'
              : `Tu suscripción venció${paidUntil ? ` el ${formatLongDate(dayKeyToDate(paidUntil)).toLowerCase()}` : ''}.`}
          </p>
          <p class="text-white/70">Para seguir usando la app, renueva tu suscripción.</p>
        {:else}
          <p class="flex items-start gap-2 font-semibold text-red-300">
            <Icon name={error.offline ? 'cloudOff' : 'alert'} class="mt-0.5 size-5 shrink-0" />{error.message}
          </p>
        {/if}
        {#if support && error.code !== 'invalid_credentials'}
          <SupportLink contact={support} message="Hola, necesito ayuda con mi cuenta de Turnos." />
        {/if}
      </div>
    {/if}

    <button
      type="submit"
      class="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-orange-500 text-lg font-black text-white shadow-lg shadow-orange-500/30 transition active:scale-[0.98] disabled:opacity-50"
      disabled={busy || !username.trim() || !password}
    >
      {#if busy}
        <span class="size-5 animate-spin rounded-full border-2 border-white/40 border-t-white"></span>Ingresando…
      {:else}
        <Icon name="lock" />Ingresar
      {/if}
    </button>
    {#if installPrompt.available}
      <button
        type="button"
        class="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-white/8 font-bold text-orange-400 ring-1 ring-white/10 active:scale-[0.98]"
        onclick={promptInstall}
      >
        <Icon name="download" />Instalar app en el celular
      </button>
    {/if}
    <p class="pt-2 text-center text-xs text-white/40">¿Olvidaste tu clave? Pide una nueva a tu proveedor.</p>
  </form>
</AuthLayout>

<!-- Contacto de ventas: abajo a la derecha, sobre el login -->
<a
  href={whatsappLink(SALES_WHATSAPP, SALES_MESSAGE)}
  target="_blank"
  rel="noopener noreferrer"
  class="fixed right-5 bottom-[max(1.25rem,env(safe-area-inset-bottom))] z-10 grid size-14 place-items-center rounded-full bg-orange-500 text-white shadow-lg shadow-orange-500/40 transition active:scale-90"
  aria-label="Escríbenos por WhatsApp para más información"
  title="Más información por WhatsApp"
>
  <Icon name="whatsapp" class="size-8" />
</a>
