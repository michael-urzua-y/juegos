<script lang="ts">
  import { settings } from '@/features/settings'
  import { alarmSessions, extend, finish, finishAllAlarms } from '@/features/sessions'
  import { clock } from '@/shared/lib/clock.svelte'
  import { formatDuration } from '@/shared/lib/format'
  import Icon from '@/shared/ui/Icon.svelte'

  const alarms = $derived(alarmSessions())
  const bigButton = 'flex h-16 items-center justify-center gap-2 rounded-2xl text-xl active:scale-95'
</script>

{#if alarms.length}
  <div
    class="fixed inset-0 z-50 flex animate-flash flex-col overflow-y-auto px-4 pt-[max(1.5rem,env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))] text-white"
    role="alertdialog"
    aria-modal="true"
    aria-labelledby="alarm-title"
  >
    <div class="mx-auto flex w-full max-w-md flex-1 flex-col">
      <div class="flex items-center justify-center gap-3 py-4">
        <Icon name="bell" class="size-10 animate-bounce" />
        <h2 id="alarm-title" class="text-3xl font-black">¡Se acabó el tiempo!</h2>
      </div>

      <ul class="flex-1 space-y-3">
        {#each alarms as s (s.id)}
          <li class="animate-pop rounded-3xl bg-white/15 p-4 backdrop-blur">
            <div class="flex items-baseline justify-between gap-3">
              <p class="truncate text-4xl font-black">{s.name}</p>
              <p class="shrink-0 text-lg font-bold tabular-nums opacity-90">+{formatDuration(clock.now - s.endsAt)}</p>
            </div>
            {#if s.game}<p class="text-lg font-semibold opacity-90">{s.game}</p>{/if}

            <div class="mt-4 grid grid-cols-2 gap-3">
              <button type="button" class={[bigButton, 'bg-white/20 font-bold']} onclick={() => extend(s.id)}>
                <Icon name="plus" class="size-6" />{settings.extendMinutes} min
              </button>
              <button
                type="button"
                class={[bigButton, 'bg-white font-black text-red-700']}
                onclick={() => finish(s.id)}
              >
                <Icon name="check" class="size-6" />Listo
              </button>
            </div>
          </li>
        {/each}
      </ul>

      {#if alarms.length > 1}
        <button
          type="button"
          class={[bigButton, 'mt-4 w-full bg-white font-black text-red-700']}
          onclick={finishAllAlarms}
        >
          Listo todos ({alarms.length})
        </button>
      {/if}
    </div>
  </div>
{/if}
