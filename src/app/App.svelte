<script lang="ts">
  import { AdminMenu, AlarmPage } from '@/features/admin'
  import { AlarmOverlay } from '@/features/alarm'
  import { auth, AuthLayout, BlockedView, ChangePasswordForm, isAdmin, LoginView } from '@/features/auth'
  import { ClientsView } from '@/features/clients'
  import { CashView } from '@/features/reports'
  import { ActiveView, NewView, prefillDraft, type Session } from '@/features/sessions'
  import { GamesEditor, PlansEditor } from '@/features/settings'
  import { unlockAudio } from '@/shared/platform/sound'
  import Icon from '@/shared/ui/Icon.svelte'
  import Toaster from '@/shared/ui/Toaster.svelte'
  import {
    account,
    canUseApp,
    ensureConnected,
    onAccountChanged,
    signIn,
    signOut,
    updatePassword,
  } from './account.svelte'
  import AccountView from './AccountView.svelte'
  import AppHeader from './AppHeader.svelte'
  import BottomNav from './BottomNav.svelte'
  import NotificationBanner from './NotificationBanner.svelte'
  import { currentRoute, go, goTab, router } from './router.svelte'
  import SubscriptionBanner from './SubscriptionBanner.svelte'

  const user = $derived(auth.me?.user)
  const wide = $derived(!!currentRoute().wide)

  // Cada cambio de sesión (entrar, suspensión, clave temporal) decide qué se muestra y si se sincroniza.
  $effect(() => {
    void user?.id
    void user?.status
    void user?.mustChangePassword
    onAccountChanged()
    void ensureConnected()
  })

  // El panel de clientes es solo para administradores (el servidor también lo exige).
  $effect(() => {
    if (router.route === 'admin/clients' && user && !isAdmin()) goTab('admin')
  })

  function repeat(s: Session) {
    prefillDraft(s)
    goTab('new')
  }
</script>

<svelte:window onpointerdown={unlockAudio} />

{#if !user}
  <LoginView onSubmit={signIn} />
{:else if user.mustChangePassword}
  <AuthLayout subtitle="Crea tu clave personal para continuar">
    <ChangePasswordForm dark currentLabel="Clave temporal" onSubmit={updatePassword} />
    <button
      type="button"
      class="mx-auto mt-6 block py-2 text-sm font-semibold text-white/50"
      onclick={() => signOut({ force: true })}
    >
      Salir
    </button>
  </AuthLayout>
{:else if user.status !== 'active'}
  <BlockedView onSignOut={() => signOut({ force: true })} />
{:else if !account.ready}
  <AuthLayout>
    <div class="space-y-4 text-center">
      {#if account.error}
        <p class="flex items-center justify-center gap-2 font-semibold text-red-300">
          <Icon name="cloudOff" />{account.error}
        </p>
        <button type="button" class="chip chip-on mx-auto h-12 px-6" onclick={ensureConnected}>Reintentar</button>
      {:else}
        <span class="mx-auto block size-8 animate-spin rounded-full border-4 border-white/20 border-t-orange-500"
        ></span>
        <p class="text-white/60">Cargando tus datos…</p>
      {/if}
    </div>
  </AuthLayout>
{:else if canUseApp()}
  <div class={['mx-auto flex min-h-dvh flex-col', wide ? 'max-w-6xl' : 'max-w-md']}>
    <AppHeader />

    <main class="flex-1 px-4 pb-[calc(6rem+env(safe-area-inset-bottom))]">
      <SubscriptionBanner />
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
          {:else if router.route === 'admin/account'}
            <AccountView />
          {:else if router.route === 'admin/clients' && isAdmin()}
            <ClientsView />
          {/if}
        </div>
      {/key}
    </main>

    <BottomNav />
  </div>

  <AlarmOverlay />
{/if}

<Toaster />
