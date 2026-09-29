<script lang="ts">
  import { activePlans, settings } from '@/features/settings'
  import { LIMITS } from '@/shared/config'
  import { clock } from '@/shared/lib/clock.svelte'
  import { formatMoney } from '@/shared/lib/format'
  import { startOfDay } from '@/shared/lib/time'
  import { requestNotificationPermission } from '@/shared/platform/notifications.svelte'
  import Icon from '@/shared/ui/Icon.svelte'
  import { toast } from '@/shared/ui/toast.svelte'
  import { draft } from '../draft.svelte'
  import { sessions, startSession } from '../store.svelte'

  let input: HTMLInputElement | undefined = $state()

  const plans = $derived(activePlans())
  const plan = $derived(plans.find((p) => p.minutes === draft.planMinutes) ?? plans[0])
  const canStart = $derived(draft.name.trim().length > 0 && !!plan)

  // Nombres de hoy para autocompletar (un niño suele repetir).
  const todayStart = $derived(startOfDay(clock.now))
  const recentNames = $derived([...new Set(sessions.filter((s) => s.startedAt >= todayStart).map((s) => s.name))])

  function submit(e: SubmitEvent) {
    e.preventDefault()
    if (!plan || !startSession(draft.name, draft.game, plan)) {
      input?.focus()
      return
    }
    void requestNotificationPermission()
    toast(`${draft.name.trim()} empezó · ${plan.minutes} min`)
    draft.name = ''
    input?.blur()
  }
</script>

<form class="card space-y-4" onsubmit={submit}>
  <input
    bind:this={input}
    bind:value={draft.name}
    class="field h-14 text-xl"
    placeholder="Nombre del niño"
    maxlength={LIMITS.nameMaxLength}
    autocomplete="off"
    autocapitalize="words"
    enterkeyhint="go"
    list="recent-names"
    aria-label="Nombre del niño"
  />
  <datalist id="recent-names">
    {#each recentNames as n (n)}<option value={n}></option>{/each}
  </datalist>

  {#if settings.games.length}
    <div class="flex flex-wrap gap-2" role="group" aria-label="Juego">
      {#each settings.games as g (g)}
        <button
          type="button"
          class={['chip h-10 px-4 text-sm', draft.game === g && 'chip-on']}
          aria-pressed={draft.game === g}
          onclick={() => (draft.game = draft.game === g ? '' : g)}
        >
          {g}
        </button>
      {/each}
    </div>
  {/if}

  <div class="grid grid-cols-4 gap-2" role="group" aria-label="Tiempo">
    {#each plans as p (p.minutes)}
      <button
        type="button"
        class={['chip h-16 flex-col', plan?.minutes === p.minutes && 'chip-on']}
        aria-pressed={plan?.minutes === p.minutes}
        onclick={() => (draft.planMinutes = p.minutes)}
      >
        <span class="text-xl leading-none">{p.minutes}<span class="text-sm">′</span></span>
        {#if p.price > 0}
          <span class="mt-1 text-[11px] font-semibold opacity-75">{formatMoney(p.price)}</span>
        {/if}
      </button>
    {/each}
  </div>

  <button
    type="submit"
    class="flex h-16 w-full items-center justify-center gap-2 rounded-2xl bg-orange-500 text-xl font-black text-white shadow-lg shadow-orange-500/30 transition active:scale-[0.98] disabled:opacity-40 disabled:shadow-none"
    disabled={!canStart}
  >
    <Icon name="play" class="size-6 fill-current" />
    Iniciar{#if plan}&nbsp;· {plan.minutes} min{/if}
  </button>
</form>
