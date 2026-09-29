<script lang="ts">
  import { AlarmOverlay, testAlarm } from '@/features/alarm'
  import { PlayView, prefillDraft, type Session } from '@/features/sessions'
  import { SettingsView } from '@/features/settings'
  import { SummaryView } from '@/features/summary'
  import { unlockAudio } from '@/shared/platform/sound'
  import AppHeader from './AppHeader.svelte'
  import BottomNav from './BottomNav.svelte'
  import { currentView, nav } from './navigation.svelte'

  function repeat(s: Session) {
    prefillDraft(s)
    nav.view = 'play'
  }
</script>

<svelte:window onpointerdown={unlockAudio} />

<div class="mx-auto flex min-h-dvh max-w-md flex-col">
  <AppHeader title={currentView().title} />

  <main class="flex-1 px-4 pb-[calc(6rem+env(safe-area-inset-bottom))]">
    {#if nav.view === 'play'}
      <PlayView />
    {:else if nav.view === 'summary'}
      <SummaryView onRepeat={repeat} />
    {:else}
      <SettingsView onTestAlarm={testAlarm} />
    {/if}
  </main>

  <BottomNav />
</div>

<AlarmOverlay />
