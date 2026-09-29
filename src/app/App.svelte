<script lang="ts">
  import { AdminMenu, AlarmPage } from '@/features/admin'
  import { AlarmOverlay } from '@/features/alarm'
  import { CashView } from '@/features/reports'
  import { ActiveView, NewView, prefillDraft, type Session } from '@/features/sessions'
  import { GamesEditor, PlansEditor } from '@/features/settings'
  import { unlockAudio } from '@/shared/platform/sound'
  import Toaster from '@/shared/ui/Toaster.svelte'
  import AppHeader from './AppHeader.svelte'
  import BottomNav from './BottomNav.svelte'
  import NotificationBanner from './NotificationBanner.svelte'
  import { go, goTab, router } from './router.svelte'

  function repeat(s: Session) {
    prefillDraft(s)
    goTab('new')
  }
</script>

<svelte:window onpointerdown={unlockAudio} />

<div class="mx-auto flex min-h-dvh max-w-md flex-col">
  <AppHeader />

  <main class="flex-1 px-4 pb-[calc(6rem+env(safe-area-inset-bottom))]">
    {#if router.route === 'new' || router.route === 'active'}
      <NotificationBanner />
    {/if}
    {#key router.route}
      <div class="animate-pop">
        {#if router.route === 'new'}
          <NewView onShowAll={() => goTab('active')} />
        {:else if router.route === 'active'}
          <ActiveView onAdd={() => goTab('new')} />
        {:else if router.route === 'admin'}
          <AdminMenu onOpen={(page) => go(`admin/${page}`)} />
        {:else if router.route === 'admin/cash'}
          <CashView onRepeat={repeat} />
        {:else if router.route === 'admin/games'}
          <GamesEditor />
        {:else if router.route === 'admin/plans'}
          <PlansEditor />
        {:else if router.route === 'admin/alarm'}
          <AlarmPage />
        {/if}
      </div>
    {/key}
  </main>

  <BottomNav />
</div>

<Toaster />
<AlarmOverlay />
