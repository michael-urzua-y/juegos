<script lang="ts">
  import { hasActiveSessions } from '@/features/sessions'
  import { installPrompt, promptInstall } from '@/shared/platform/install.svelte'
  import { wakeLock } from '@/shared/platform/wakelock.svelte'
  import Icon from '@/shared/ui/Icon.svelte'
  import { confirmSignOut } from './account.svelte'
  import { back, currentRoute } from './router.svelte'

  const route = $derived(currentRoute())
  const pill = 'flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold'
</script>

<header
  class="sticky top-0 z-20 flex min-h-16 items-center justify-between gap-2 bg-orange-50/85 px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3 backdrop-blur-lg dark:bg-zinc-950/85"
>
  <div class="flex min-w-0 items-center gap-1">
    {#if route.parent}
      <button
        type="button"
        class="-ml-2 grid size-10 shrink-0 place-items-center rounded-full active:bg-black/5 dark:active:bg-white/10"
        onclick={back}
        aria-label="Volver"
      >
        <Icon name="chevronLeft" class="size-7" />
      </button>
    {/if}
    <h1 class={['truncate font-black tracking-tight', route.parent ? 'text-2xl' : 'text-3xl']}>{route.title}</h1>
  </div>
  <div class="flex shrink-0 items-center gap-2">
    {#if hasActiveSessions()}
      {#if wakeLock.active}
        <span
          class={[pill, 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300']}
          title="La pantalla no se apagará"
        >
          <Icon name="sun" class="size-4" /><span class="sr-only sm:not-sr-only">Pantalla activa</span>
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
    <button
      type="button"
      class="grid size-10 place-items-center rounded-full text-zinc-500 active:bg-black/5 dark:text-zinc-400 dark:active:bg-white/10"
      onclick={confirmSignOut}
      aria-label="Cerrar sesión"
      title="Cerrar sesión"
    >
      <Icon name="logOut" />
    </button>
  </div>
</header>
