<script lang="ts">
  import { formatMonth } from '../lib/format'
  import { addMonths, compareMonths, monthGrid, monthOf, type MonthRef } from '../lib/time'
  import Icon from './Icon.svelte'

  let {
    selected = $bindable(),
    max,
    marked = new Set<string>(),
  }: {
    /** Día elegido, "AAAA-MM-DD". */
    selected: string
    /** Último día elegible (hoy): los posteriores quedan bloqueados. */
    max: string
    /** Días con datos, se marcan con un punto. */
    marked?: ReadonlySet<string>
  } = $props()

  const WEEKDAYS = ['L', 'M', 'M', 'J', 'V', 'S', 'D']

  let view: MonthRef = $state(monthOf(selected))
  const cells = $derived(monthGrid(view))
  const canGoNext = $derived(compareMonths(view, monthOf(max)) < 0)

  // Si el día elegido cambia desde afuera (p. ej. "Hoy"), el calendario lo muestra.
  $effect(() => {
    view = monthOf(selected)
  })

  const move = (delta: number) => (view = addMonths(view, delta))
  const dayNumber = (key: string) => Number(key.slice(8))
</script>

<div>
  <div class="mb-2 flex items-center justify-between">
    <button
      type="button"
      class="grid size-10 place-items-center rounded-xl active:bg-zinc-100 dark:active:bg-zinc-800"
      onclick={() => move(-1)}
      aria-label="Mes anterior"
    >
      <Icon name="chevronLeft" />
    </button>
    <p class="text-base font-black">{formatMonth(view.year, view.month)}</p>
    <button
      type="button"
      class="grid size-10 place-items-center rounded-xl active:bg-zinc-100 disabled:opacity-25 dark:active:bg-zinc-800"
      onclick={() => move(1)}
      disabled={!canGoNext}
      aria-label="Mes siguiente"
    >
      <Icon name="chevronRight" />
    </button>
  </div>

  <div class="grid grid-cols-7 gap-1 text-center" role="grid" aria-label={formatMonth(view.year, view.month)}>
    {#each WEEKDAYS as w, i (i)}
      <span class="pb-1 text-xs font-bold text-zinc-400" aria-hidden="true">{w}</span>
    {/each}
    {#each cells as key, i (key ?? `empty-${i}`)}
      {#if key}
        {@const future = key > max}
        {@const isSelected = key === selected}
        <button
          type="button"
          class={[
            'relative flex aspect-square flex-col items-center justify-center rounded-xl text-sm font-bold tabular-nums transition',
            isSelected
              ? 'bg-orange-500 text-white shadow-md shadow-orange-500/30'
              : future
                ? 'text-zinc-300 dark:text-zinc-700'
                : 'active:bg-zinc-100 dark:active:bg-zinc-800',
            key === max && !isSelected && 'ring-2 ring-orange-500 ring-inset',
          ]}
          disabled={future}
          aria-pressed={isSelected}
          aria-label={key}
          onclick={() => (selected = key)}
        >
          {dayNumber(key)}
          {#if marked.has(key)}
            <span class={['absolute bottom-1.5 size-1 rounded-full', isSelected ? 'bg-white' : 'bg-orange-500']}></span>
          {/if}
        </button>
      {:else}
        <span></span>
      {/if}
    {/each}
  </div>
</div>
