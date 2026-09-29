<script lang="ts">
  let { checked = $bindable(), label }: { checked: boolean; label: string } = $props()
</script>

<button
  type="button"
  role="switch"
  aria-checked={checked}
  class="flex w-full items-center justify-between py-3 text-left text-base font-semibold"
  onclick={() => (checked = !checked)}
>
  {label}
  <span
    class={[
      'relative h-8 w-14 shrink-0 rounded-full transition-colors',
      checked ? 'bg-orange-500' : 'bg-zinc-300 dark:bg-zinc-700',
    ]}
  >
    <span
      class={[
        'absolute top-1 left-1 size-6 rounded-full bg-white shadow transition-transform',
        checked && 'translate-x-6',
      ]}
    ></span>
  </span>
</button>
