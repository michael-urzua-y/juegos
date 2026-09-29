<script lang="ts">
  import Icon from '@/shared/ui/Icon.svelte'
  import SectionTitle from '@/shared/ui/SectionTitle.svelte'
  import Toggle from '@/shared/ui/Toggle.svelte'
  import { settings } from '../store.svelte'

  let { onTest }: { onTest: () => void } = $props()

  const warnOptions = [
    { value: 0, label: 'No' },
    { value: 1, label: '1 min antes' },
    { value: 2, label: '2 min antes' },
    { value: 3, label: '3 min antes' },
  ]
</script>

<div class="card">
  <SectionTitle class="mb-1">Alarma</SectionTitle>
  <div class="divide-y divide-zinc-100 dark:divide-zinc-800">
    <Toggle bind:checked={settings.voice} label="Decir el nombre en voz alta" />
    <Toggle bind:checked={settings.vibrate} label="Vibrar" />
    <label class="flex items-center justify-between gap-3 py-3 text-base font-semibold">
      Avisar antes de terminar
      <select class="h-10 rounded-xl bg-zinc-100 px-3 font-semibold dark:bg-zinc-800" bind:value={settings.warnMinutes}>
        {#each warnOptions as o (o.value)}<option value={o.value}>{o.label}</option>{/each}
      </select>
    </label>
    <label class="flex items-center gap-3 py-3">
      <Icon name="volume" class="size-5 shrink-0 text-zinc-400" />
      <input
        class="w-full accent-orange-500"
        type="range"
        min="0.1"
        max="1"
        step="0.1"
        bind:value={settings.volume}
        aria-label="Volumen de los pitidos"
      />
    </label>
  </div>
  <button type="button" class="chip mt-2 h-12 w-full gap-2 text-base" onclick={onTest}>
    <Icon name="bell" />Probar alarma
  </button>
</div>
