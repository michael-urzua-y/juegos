<script lang="ts">
  import { installPrompt, promptInstall } from '@/shared/platform/install.svelte'
  import Icon from '@/shared/ui/Icon.svelte'
  import AlarmSettings from './components/AlarmSettings.svelte'
  import GamesEditor from './components/GamesEditor.svelte'
  import PlansEditor from './components/PlansEditor.svelte'
  import ReliabilityTips from './components/ReliabilityTips.svelte'
  import { resetSettings } from './store.svelte'

  let { onTestAlarm }: { onTestAlarm: () => void } = $props()

  function onReset() {
    if (confirm('¿Restaurar los ajustes de fábrica?')) resetSettings()
  }
</script>

<section class="space-y-4">
  {#if installPrompt.available}
    <button
      type="button"
      class="card flex w-full items-center gap-3 bg-orange-500! text-left text-white ring-0!"
      onclick={promptInstall}
    >
      <Icon name="download" class="size-7" />
      <span>
        <span class="block text-lg font-black">Instalar en el celular</span>
        <span class="text-sm opacity-90">Ícono propio, pantalla completa y sin internet</span>
      </span>
    </button>
  {/if}

  <PlansEditor />
  <GamesEditor />
  <AlarmSettings onTest={onTestAlarm} />
  <ReliabilityTips />

  <button type="button" class="mx-auto block py-2 text-sm font-semibold text-zinc-400" onclick={onReset}>
    Restaurar ajustes de fábrica
  </button>
</section>
