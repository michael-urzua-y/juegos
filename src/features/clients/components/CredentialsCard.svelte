<script lang="ts">
  import Icon from '@/shared/ui/Icon.svelte'
  import { toast } from '@/shared/ui/toast.svelte'

  let { username, displayName, password }: { username: string; displayName: string; password: string } = $props()

  const message = $derived(
    `Hola ${displayName}, este es tu acceso a Turnos:\n${location.origin}\n\nUsuario: ${username}\nClave temporal: ${password}\n\nAl entrar te pedirá crear tu propia clave.`,
  )

  async function copy() {
    try {
      await navigator.clipboard.writeText(message)
      toast('Datos copiados')
    } catch {
      toast('No se pudo copiar')
    }
  }

  async function share() {
    try {
      await navigator.share({ title: 'Acceso a Turnos', text: message })
    } catch {
      // El usuario canceló
    }
  }
</script>

<div class="space-y-4">
  <p class="text-sm text-zinc-500">
    Entrégale estos datos al cliente. <b>La clave temporal no se vuelve a mostrar</b>; al entrar tendrá que crear la
    suya.
  </p>
  <dl class="space-y-2 rounded-2xl bg-zinc-100 p-4 dark:bg-zinc-800">
    <div class="flex items-center justify-between gap-3">
      <dt class="text-sm text-zinc-500">Usuario</dt>
      <dd class="font-mono text-lg font-bold">{username}</dd>
    </div>
    <div class="flex items-center justify-between gap-3">
      <dt class="text-sm text-zinc-500">Clave temporal</dt>
      <dd class="font-mono text-2xl font-black tracking-wider text-orange-600 select-all dark:text-orange-400">
        {password}
      </dd>
    </div>
  </dl>
  <div class="grid grid-cols-2 gap-2">
    <button type="button" class="chip h-12 gap-2" onclick={copy}><Icon name="copy" />Copiar</button>
    {#if 'share' in navigator}
      <button type="button" class="chip chip-on h-12 gap-2" onclick={share}><Icon name="chat" />Enviar</button>
    {/if}
  </div>
</div>
