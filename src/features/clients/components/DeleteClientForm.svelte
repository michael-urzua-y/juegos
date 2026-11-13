<script lang="ts">
  import type { UserView } from '@/features/auth'
  import Icon from '@/shared/ui/Icon.svelte'

  let { client, onSubmit }: { client: UserView; onSubmit: () => Promise<void> } = $props()

  // Se confirma escribiendo el usuario: borrar no se puede deshacer
  let typed = $state('')
  let busy = $state(false)
  const matches = $derived(typed.trim().toLowerCase() === client.username)

  async function submit(e: SubmitEvent) {
    e.preventDefault()
    if (!matches || busy) return
    busy = true
    try {
      await onSubmit()
    } finally {
      busy = false
    }
  }
</script>

<form class="space-y-4" onsubmit={submit}>
  <div class="flex gap-3 rounded-2xl bg-red-500/10 p-4 text-sm text-red-700 dark:text-red-300">
    <Icon name="alert" class="size-5 shrink-0" />
    <p>
      Se eliminará <b>{client.displayName}</b> con sus turnos, su caja, sus ajustes y su historial de pagos.
      <b>No se puede deshacer.</b>
    </p>
  </div>
  <label class="block">
    <span class="mb-1 block text-sm font-semibold text-zinc-500">
      Para confirmar, escribe <span class="font-mono text-zinc-900 dark:text-zinc-100">{client.username}</span>
    </span>
    <input
      class="field font-mono"
      bind:value={typed}
      autocomplete="off"
      autocapitalize="off"
      spellcheck="false"
      aria-label="Usuario a eliminar"
    />
  </label>
  <button
    type="submit"
    class="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-red-600 text-lg font-black text-white active:scale-[0.98] disabled:opacity-40"
    disabled={!matches || busy}
  >
    <Icon name="trash" />{busy ? 'Eliminando…' : 'Eliminar cliente'}
  </button>
</form>
