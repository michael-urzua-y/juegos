<script lang="ts">
  import { extendDate, type UserView } from '@/features/auth'
  import { formatLongDate } from '@/shared/lib/format'
  import { dayKeyToDate } from '@/shared/lib/time'

  let { client, today, onSubmit }: { client: UserView; today: string; onSubmit: (months: number) => Promise<void> } =
    $props()

  const OPTIONS = [1, 3, 6, 12]
  let months = $state(1)
  let busy = $state(false)

  const until = $derived(extendDate(client.paidUntil, today, months))
  const fmt = (d: string) => formatLongDate(dayKeyToDate(d))

  async function submit() {
    busy = true
    try {
      await onSubmit(months)
    } finally {
      busy = false
    }
  }
</script>

<div class="space-y-4">
  <p class="text-sm text-zinc-500">
    {client.displayName} · vence {client.paidUntil ? fmt(client.paidUntil).toLowerCase() : 'sin fecha'}
  </p>
  <div class="grid grid-cols-4 gap-2" role="radiogroup" aria-label="Meses pagados">
    {#each OPTIONS as m (m)}
      <button
        type="button"
        role="radio"
        aria-checked={months === m}
        class={['chip h-16 flex-col', months === m && 'chip-on']}
        onclick={() => (months = m)}
      >
        <span class="text-xl leading-none">{m}</span><span class="text-xs">{m === 1 ? 'mes' : 'meses'}</span>
      </button>
    {/each}
  </div>
  <p class="rounded-2xl bg-emerald-50 p-3 text-center text-sm dark:bg-emerald-950">
    Nuevo vencimiento: <b class="text-emerald-700 dark:text-emerald-300">{fmt(until)}</b>
  </p>
  <button
    type="button"
    class="flex h-14 w-full items-center justify-center rounded-2xl bg-emerald-600 text-lg font-black text-white active:scale-[0.98] disabled:opacity-50"
    disabled={busy}
    onclick={submit}
  >
    {busy ? 'Registrando…' : 'Registrar pago'}
  </button>
</div>
