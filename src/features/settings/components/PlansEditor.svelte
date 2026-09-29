<script lang="ts">
  import { LIMITS } from '@/shared/config'
  import Icon from '@/shared/ui/Icon.svelte'
  import IconButton from '@/shared/ui/IconButton.svelte'
  import NumberField from '@/shared/ui/NumberField.svelte'
  import SectionTitle from '@/shared/ui/SectionTitle.svelte'
  import { addPlan, removePlan, settings } from '../store.svelte'
</script>

<div class="card">
  <SectionTitle>Tiempos y precios</SectionTitle>
  <div class="space-y-2">
    {#each settings.plans as plan, i (i)}
      <div class="flex items-center gap-2">
        <NumberField
          bind:value={plan.minutes}
          min={LIMITS.minutesMin}
          max={LIMITS.minutesMax}
          label="Minutos"
          suffix="min"
        />
        <NumberField bind:value={plan.price} min={0} max={LIMITS.priceMax} step={100} label="Precio" prefix="$" />
        <IconButton icon="x" label="Quitar tiempo" onclick={() => removePlan(i)} class="size-12! text-zinc-400" />
      </div>
    {/each}
  </div>
  {#if settings.plans.length < LIMITS.maxPlans}
    <button type="button" class="chip mt-3 h-11 w-full gap-1 text-sm" onclick={addPlan}>
      <Icon name="plus" />Agregar tiempo
    </button>
  {/if}

  <SectionTitle class="mt-5 mb-2">Botón de extensión</SectionTitle>
  <div class="flex items-center gap-2">
    <NumberField
      bind:value={settings.extendMinutes}
      min={LIMITS.minutesMin}
      max={LIMITS.minutesMax}
      label="Minutos de extensión"
      suffix="min"
    />
    <NumberField
      bind:value={settings.extendPrice}
      min={0}
      max={LIMITS.priceMax}
      step={100}
      label="Precio de extensión"
      prefix="$"
    />
    <div class="size-12 shrink-0"></div>
  </div>
</div>
