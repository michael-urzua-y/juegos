<script lang="ts">
  import type { SubscriptionBadge } from '../subscription'

  let { badge }: { badge: SubscriptionBadge } = $props()

  const tones = {
    ok: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
    warn: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300',
    danger: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300',
    muted: 'bg-zinc-200 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300',
  }
</script>

<span class={['inline-block rounded-full px-2.5 py-0.5 text-xs font-bold whitespace-nowrap', tones[badge.tone]]}>
  {badge.label}
</span>
