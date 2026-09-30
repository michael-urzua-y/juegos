<script lang="ts">
  import type { Snippet } from 'svelte'

  let { children, subtitle }: { children: Snippet; subtitle?: string } = $props()
</script>

<!-- Mismo fondo que la pantalla de inicio de la PWA: el paso del splash al login se ve continuo -->
<div
  class="flex min-h-dvh flex-col items-center justify-center bg-[radial-gradient(ellipse_at_50%_30%,#2e1a0e_0%,#0c0a09_65%)] px-6 pt-[max(2rem,env(safe-area-inset-top))] pb-[max(2rem,env(safe-area-inset-bottom))] text-white"
>
  <div class="w-full max-w-sm animate-pop">
    <img src="/logo.webp" alt="Monay Solutions" width="240" height="222" class="mx-auto h-auto w-52 select-none" />
    {#if subtitle}<p class="mt-4 text-center text-sm font-semibold text-white/60">{subtitle}</p>{/if}
    <div class="mt-8">{@render children()}</div>
  </div>
</div>
