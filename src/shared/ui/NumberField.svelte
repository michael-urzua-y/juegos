<script lang="ts">
  import { clampInt } from '../lib/sanitize'

  let {
    value = $bindable(),
    min,
    max,
    step = 1,
    label,
    prefix,
    suffix,
  }: {
    value: number
    min: number
    max: number
    step?: number
    label: string
    prefix?: string
    suffix?: string
  } = $props()

  // Se valida al confirmar (blur/enter): el estado nunca queda vacío ni fuera de rango.
  function commit(e: Event & { currentTarget: HTMLInputElement }) {
    value = clampInt(e.currentTarget.value, min, max, value)
    e.currentTarget.value = String(value)
  }
</script>

<label class="relative block flex-1">
  {#if prefix}<span class="pointer-events-none absolute top-3 left-4 text-zinc-400">{prefix}</span>{/if}
  <input
    class={['field', prefix && 'pl-8', suffix && 'pr-14']}
    type="number"
    inputmode="numeric"
    {min}
    {max}
    {step}
    {value}
    aria-label={label}
    onchange={commit}
  />
  {#if suffix}<span class="pointer-events-none absolute top-3 right-4 text-zinc-400">{suffix}</span>{/if}
</label>
