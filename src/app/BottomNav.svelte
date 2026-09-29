<script lang="ts">
  import { activeSessions } from '@/features/sessions'
  import Icon from '@/shared/ui/Icon.svelte'
  import { nav, VIEWS } from './navigation.svelte'

  const activeCount = $derived(activeSessions().length)
</script>

<nav
  class="fixed inset-x-0 bottom-0 z-30 border-t border-black/5 bg-white/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-lg dark:border-white/10 dark:bg-zinc-900/90"
>
  <div class="mx-auto grid max-w-md grid-cols-3">
    {#each VIEWS as v (v.id)}
      <button
        type="button"
        class={[
          'relative flex h-16 flex-col items-center justify-center gap-1 text-xs font-bold transition-colors',
          nav.view === v.id ? 'text-orange-600 dark:text-orange-400' : 'text-zinc-400',
        ]}
        aria-current={nav.view === v.id ? 'page' : undefined}
        onclick={() => (nav.view = v.id)}
      >
        <Icon name={v.icon} class="size-6" />
        {v.label}
        {#if v.id === 'play' && activeCount && nav.view !== 'play'}
          <span
            class="absolute top-2 left-1/2 ml-2 grid h-5 min-w-5 place-items-center rounded-full bg-orange-500 px-1 text-[11px] text-white"
          >
            {activeCount}
          </span>
        {/if}
      </button>
    {/each}
  </div>
</nav>
