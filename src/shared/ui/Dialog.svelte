<script lang="ts">
  import type { Snippet } from 'svelte'
  import Icon from './Icon.svelte'

  let { open, title, onClose, children }: { open: boolean; title: string; onClose: () => void; children: Snippet } =
    $props()

  let dialog: HTMLDialogElement | undefined = $state()

  // <dialog> nativo: foco atrapado, Esc para cerrar y accesible sin librerías.
  $effect(() => {
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  })
</script>

<dialog
  bind:this={dialog}
  class="m-auto w-[calc(100%-2rem)] max-w-md rounded-3xl bg-white p-0 text-zinc-900 shadow-2xl backdrop:bg-black/60 backdrop:backdrop-blur-sm dark:bg-zinc-900 dark:text-zinc-100"
  aria-labelledby="dialog-title"
  onclose={onClose}
  onclick={(e) => e.target === dialog && onClose()}
>
  <div class="animate-pop p-5">
    <div class="mb-4 flex items-center justify-between gap-3">
      <h2 id="dialog-title" class="text-xl font-black">{title}</h2>
      <button
        type="button"
        class="grid size-10 place-items-center rounded-full active:bg-zinc-100 dark:active:bg-zinc-800"
        aria-label="Cerrar"
        onclick={onClose}
      >
        <Icon name="x" />
      </button>
    </div>
    {@render children()}
  </div>
</dialog>
