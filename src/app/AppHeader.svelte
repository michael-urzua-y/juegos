<script lang="ts">
  import { hasActiveSessions } from '@/features/sessions'
  import { installPrompt, promptInstall } from '@/shared/platform/install.svelte'
  import { wakeLock } from '@/shared/platform/wakelock.svelte'
  import Icon from '@/shared/ui/Icon.svelte'

  let { title }: { title: string } = $props()

  const pill = 'flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold'
</script>

<header
  class="sticky top-0 z-20 flex items-center justify-between gap-3 bg-orange-50/85 px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3 backdrop-blur-lg dark:bg-zinc-950/85"
>
  <h1 class="text-3xl font-black tracking-tight">{title}</h1>
  <div class="flex items-center gap-2">
    {#if hasActiveSessions()}
      {#if wakeLock.active}
        <span class={[pill, 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300']}>
          <Icon name="sun" class="size-4" />Pantalla activa
        </span>
      {:else}
        <span class={[pill, 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300']}>
          <Icon name="alert" class="size-4" />No bloquees
        </span>
      {/if}
    {/if}
    {#if installPrompt.available}
      <button
        type="button"
        class="grid size-10 place-items-center rounded-full bg-orange-500 text-white"
        onclick={promptInstall}
        aria-label="Instalar app"
      >
        <Icon name="download" />
      </button>
    {/if}
  </div>
</header>
