<script lang="ts">
  import Icon, { type IconName } from './Icon.svelte'

  let {
    icon,
    label,
    detail,
    color = 'bg-orange-500',
    onclick,
  }: { icon: IconName; label: string; detail?: string; color?: string; onclick: () => void } = $props()
</script>

<button
  type="button"
  class="flex w-full items-center gap-3 px-4 py-3 text-left active:bg-zinc-50 dark:active:bg-zinc-800/60"
  {onclick}
>
  <span class={['grid size-10 shrink-0 place-items-center rounded-xl text-white', color]}>
    <Icon name={icon} />
  </span>
  <span class="min-w-0 flex-1">
    <span class="block font-bold">{label}</span>
    {#if detail}<span class="block truncate text-sm text-zinc-500">{detail}</span>{/if}
  </span>
  <Icon name="chevronRight" class="size-5 shrink-0 text-zinc-300 dark:text-zinc-600" />
</button>
