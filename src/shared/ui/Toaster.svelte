<script lang="ts">
  import Icon from './Icon.svelte'
  import { toasts } from './toast.svelte'
</script>

<div
  class="pointer-events-none fixed inset-x-0 bottom-[calc(5rem+env(safe-area-inset-bottom))] z-40 flex flex-col items-center gap-2 px-4"
  role="status"
  aria-live="polite"
>
  {#each toasts as t (t.id)}
    <p
      class="flex animate-pop items-center gap-2 rounded-full bg-zinc-900 px-4 py-2.5 text-sm font-bold text-white shadow-lg dark:bg-white dark:text-zinc-900"
    >
      <Icon name="check" class="size-4 text-emerald-400 dark:text-emerald-600" />{t.message}
    </p>
  {/each}
</div>
