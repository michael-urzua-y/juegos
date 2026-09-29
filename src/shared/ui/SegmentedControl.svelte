<script lang="ts" generics="T extends string">
  let {
    value = $bindable(),
    options,
    label,
  }: { value: T; options: readonly { id: T; label: string }[]; label: string } = $props()
</script>

<div
  class="grid gap-1 rounded-2xl bg-zinc-200/70 p-1 dark:bg-zinc-800"
  style:grid-template-columns="repeat({options.length}, minmax(0, 1fr))"
  role="radiogroup"
  aria-label={label}
>
  {#each options as o (o.id)}
    <button
      type="button"
      role="radio"
      aria-checked={value === o.id}
      class={[
        'h-10 rounded-xl text-sm font-bold transition',
        value === o.id ? 'bg-white shadow dark:bg-zinc-950' : 'text-zinc-500 dark:text-zinc-400',
      ]}
      onclick={() => (value = o.id)}
    >
      {o.label}
    </button>
  {/each}
</div>
