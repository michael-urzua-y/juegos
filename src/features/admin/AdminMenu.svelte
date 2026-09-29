<script lang="ts">
  import { clearArchive, statsOfDay } from '@/features/reports'
  import { clearHistory } from '@/features/sessions'
  import { activePlans, resetSettings, settings } from '@/features/settings'
  import { clock } from '@/shared/lib/clock.svelte'
  import { formatMoney, plural } from '@/shared/lib/format'
  import { dayKey } from '@/shared/lib/time'
  import { installPrompt, promptInstall } from '@/shared/platform/install.svelte'
  import Icon from '@/shared/ui/Icon.svelte'
  import MenuItem from '@/shared/ui/MenuItem.svelte'
  import SectionTitle from '@/shared/ui/SectionTitle.svelte'
  import { toast } from '@/shared/ui/toast.svelte'
  import type { AdminPage } from './pages'

  let { onOpen }: { onOpen: (page: AdminPage) => void } = $props()

  const today = $derived(statsOfDay(dayKey(clock.now)))
  const alarmDetail = $derived(
    [
      settings.voice && 'Voz',
      settings.vibrate && 'vibración',
      settings.warnMinutes ? `aviso ${settings.warnMinutes} min antes` : 'sin aviso previo',
    ]
      .filter(Boolean)
      .join(' · '),
  )

  function onReset() {
    if (!confirm('¿Restaurar juegos, tiempos, precios y alarma a los valores de fábrica?')) return
    resetSettings()
    toast('Ajustes restaurados')
  }

  function onClearHistory() {
    if (!confirm('¿Borrar todo el historial de caja? Los niños que están jugando se mantienen. No se puede deshacer.'))
      return
    clearHistory()
    clearArchive()
    toast('Historial borrado')
  }
</script>

<section class="space-y-5">
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

  <div>
    <SectionTitle class="mb-2 px-1">Negocio</SectionTitle>
    <div class="card divide-y divide-zinc-100 overflow-hidden p-0! dark:divide-zinc-800">
      <MenuItem
        icon="coins"
        color="bg-emerald-500"
        label="Caja del día"
        detail="Hoy: {formatMoney(today.total)} · {plural(today.kids, 'niño', 'niños')}"
        onclick={() => onOpen('cash')}
      />
    </div>
  </div>

  <div>
    <SectionTitle class="mb-2 px-1">Configuración</SectionTitle>
    <div class="card divide-y divide-zinc-100 overflow-hidden p-0! dark:divide-zinc-800">
      <MenuItem
        icon="tent"
        label="Juegos"
        detail={settings.games.length ? settings.games.join(', ') : 'Sin juegos'}
        onclick={() => onOpen('games')}
      />
      <MenuItem
        icon="timer"
        color="bg-sky-500"
        label="Tiempos y precios"
        detail={activePlans()
          .map((p) => `${p.minutes}′ ${formatMoney(p.price)}`)
          .join(' · ')}
        onclick={() => onOpen('plans')}
      />
      <MenuItem
        icon="bell"
        color="bg-violet-500"
        label="Alarma y sonido"
        detail={alarmDetail}
        onclick={() => onOpen('alarm')}
      />
    </div>
  </div>

  <div class="space-y-1 pt-2 text-center">
    <button type="button" class="block w-full py-2 text-sm font-semibold text-zinc-400" onclick={onReset}>
      Restaurar ajustes de fábrica
    </button>
    <button type="button" class="block w-full py-2 text-sm font-semibold text-red-500" onclick={onClearHistory}>
      Borrar historial de caja
    </button>
  </div>
</section>
