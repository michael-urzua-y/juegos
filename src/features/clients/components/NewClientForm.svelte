<script lang="ts">
  import { ApiError } from '@/shared/lib/api'

  let { onSubmit }: { onSubmit: (username: string, displayName: string) => Promise<void> } = $props()

  let displayName = $state('')
  let username = $state('')
  let busy = $state(false)
  let error = $state('')

  // Sugiere un usuario a partir del nombre mientras no se escriba uno a mano
  let touched = $state(false)
  const suggestion = $derived(
    displayName
      .toLowerCase()
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
      .replace(/[^a-z0-9]+/g, '.')
      .replace(/^\.|\.$/g, '')
      .slice(0, 40),
  )
  $effect(() => {
    if (!touched) username = suggestion
  })

  async function submit(e: SubmitEvent) {
    e.preventDefault()
    if (busy) return
    busy = true
    error = ''
    try {
      await onSubmit(username.trim().toLowerCase(), displayName.trim())
    } catch (err) {
      error = err instanceof ApiError ? err.message : 'No se pudo crear el cliente.'
    } finally {
      busy = false
    }
  }
</script>

<form class="space-y-3" onsubmit={submit}>
  <label class="block">
    <span class="mb-1 block text-sm font-semibold text-zinc-500">Nombre o negocio</span>
    <input
      class="field"
      bind:value={displayName}
      placeholder="Juegos Pérez"
      maxlength="60"
      required
      autocomplete="off"
    />
  </label>
  <label class="block">
    <span class="mb-1 block text-sm font-semibold text-zinc-500">Usuario para ingresar</span>
    <input
      class="field font-mono"
      bind:value={username}
      oninput={() => (touched = true)}
      placeholder="juegos.perez"
      maxlength="40"
      required
      autocomplete="off"
      autocapitalize="off"
      spellcheck="false"
    />
    <span class="mt-1 block text-xs text-zinc-400">Minúsculas, números, punto, guion o @. Puede ser su correo.</span>
  </label>
  {#if error}<p class="rounded-2xl bg-red-500/10 p-3 text-sm font-semibold text-red-600" role="alert">{error}</p>{/if}
  <button
    type="submit"
    class="flex h-14 w-full items-center justify-center rounded-2xl bg-orange-500 text-lg font-black text-white active:scale-[0.98] disabled:opacity-50"
    disabled={busy || !displayName.trim() || username.trim().length < 3}
  >
    {busy ? 'Creando…' : 'Crear cliente'}
  </button>
</form>
