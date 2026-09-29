<script lang="ts">
  import { activeSessions } from '@/features/sessions'
  import Icon from '@/shared/ui/Icon.svelte'
  import { currentRoute, goTab, TABS } from './router.svelte'

  const active = $derived(activeSessions())
  const alarms = $derived(active.filter((s) => s.status === 'alarm').length)
  const tab = $derived(currentRoute().tab)
</script>

<nav
  class="fixed inset-x-0 bottom-0 z-30 border-t border-black/5 bg-white/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-lg dark:border-white/10 dark:bg-zinc-900/90"
>
  <div class="mx-auto grid max-w-md grid-cols-3">
    {#each TABS as t (t.id)}
      <button
        type="button"
        class={[
          'relative flex h-16 flex-col items-center justify-center gap-1 text-xs font-bold transition-colors',
          tab === t.id ? 'text-orange-600 dark:text-orange-400' : 'text-zinc-400',
        ]}
        aria-current={tab === t.id ? 'page' : undefined}
        onclick={() => goTab(t.id)}
      >
        <Icon name={t.icon} class="size-6" />
        {t.label}
        {#if t.id === 'active' && active.length}
          <span
            class={[
              'absolute top-2 left-1/2 ml-2 grid h-5 min-w-5 place-items-center rounded-full px-1 text-[11px] text-white',
              alarms ? 'bg-red-600' : 'bg-orange-500',
            ]}
          >
            {active.length}
          </span>
        {/if}
      </button>
    {/each}
  </div>
</nav>
