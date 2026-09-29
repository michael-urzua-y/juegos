<script lang="ts">
  import type { ClassValue } from 'svelte/elements'
  import Icon, { type IconName } from './Icon.svelte'

  let {
    icon,
    label,
    onclick,
    class: className = 'text-zinc-400',
  }: { icon: IconName; label: string; onclick: () => void; class?: ClassValue } = $props()
</script>

<button
  type="button"
  class={['grid size-10 shrink-0 place-items-center rounded-xl active:bg-zinc-100 dark:active:bg-zinc-800', className]}
  aria-label={label}
  title={label}
  {onclick}
>
  <Icon name={icon} />
</button>
