<script lang="ts">
  import { ApiError } from '@/shared/lib/api'
  import Icon from '@/shared/ui/Icon.svelte'
  import PasswordField from '@/shared/ui/PasswordField.svelte'

  const MIN_LENGTH = 8

  let {
    onSubmit,
    onCancel,
    dark = false,
    currentLabel = 'Clave actual',
  }: {
    onSubmit: (current: string, next: string) => Promise<void>
    onCancel?: () => void
    /** Estilo para el fondo oscuro de las pantallas de acceso. */
    dark?: boolean
    currentLabel?: string
  } = $props()

  let current = $state('')
  let next = $state('')
  let repeat = $state('')
  let busy = $state(false)
  let error = $state('')

  const field = $derived(dark ? 'field h-14 bg-white/8 text-white placeholder:text-white/40' : 'field h-14')
  const tooShort = $derived(next.length > 0 && next.length < MIN_LENGTH)
  const mismatch = $derived(repeat.length > 0 && next !== repeat)
  const canSubmit = $derived(!!current && next.length >= MIN_LENGTH && next === repeat && !busy)

  async function submit(e: SubmitEvent) {
    e.preventDefault()
    if (!canSubmit) return
    busy = true
    error = ''
    try {
      await onSubmit(current, next)
    } catch (err) {
      error = err instanceof ApiError ? err.message : 'No se pudo cambiar la clave.'
    } finally {
      busy = false
    }
  }
</script>

<form class="space-y-3" onsubmit={submit} novalidate>
  <PasswordField bind:value={current} label={currentLabel} class={field} />
  <PasswordField bind:value={next} label="Nueva clave" autocomplete="new-password" class={field} maxlength={128} />
  <PasswordField bind:value={repeat} label="Repite la nueva clave" autocomplete="new-password" class={field} />

  <ul class={['space-y-1 px-1 text-sm', dark ? 'text-white/60' : 'text-zinc-500']}>
    <li class={['flex items-center gap-2', next.length >= MIN_LENGTH && 'text-emerald-500']}>
      <Icon name={next.length >= MIN_LENGTH ? 'check' : 'key'} class="size-4" />Al menos {MIN_LENGTH} caracteres
    </li>
    {#if mismatch}<li class="flex items-center gap-2 text-red-400">
        <Icon name="x" class="size-4" />Las claves no coinciden
      </li>{/if}
  </ul>

  {#if error}
    <p class="rounded-2xl bg-red-500/15 p-3 text-sm font-semibold text-red-500" role="alert">{error}</p>
  {/if}

  <button
    type="submit"
    class="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-orange-500 text-lg font-black text-white shadow-lg shadow-orange-500/30 transition active:scale-[0.98] disabled:opacity-50"
    disabled={!canSubmit || tooShort}
  >
    {#if busy}
      <span class="size-5 animate-spin rounded-full border-2 border-white/40 border-t-white"></span>Guardando…
    {:else}
      <Icon name="check" />Guardar clave
    {/if}
  </button>
  {#if onCancel}
    <button type="button" class="block w-full py-2 text-sm font-semibold text-zinc-400" onclick={onCancel}
      >Cancelar</button
    >
  {/if}
</form>
