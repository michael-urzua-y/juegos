<script lang="ts">
  import { subscriptionBadge, SubscriptionPill, type UserView } from '@/features/auth'
  import { ApiError } from '@/shared/lib/api'
  import { formatClock, formatLongDate } from '@/shared/lib/format'
  import { foldText } from '@/shared/lib/sanitize'
  import { dayKeyToDate } from '@/shared/lib/time'
  import Dialog from '@/shared/ui/Dialog.svelte'
  import Icon from '@/shared/ui/Icon.svelte'
  import SegmentedControl from '@/shared/ui/SegmentedControl.svelte'
  import { toast } from '@/shared/ui/toast.svelte'
  import * as clientsApi from './api'
  import CredentialsCard from './components/CredentialsCard.svelte'
  import NewClientForm from './components/NewClientForm.svelte'
  import PaymentForm from './components/PaymentForm.svelte'

  let clients = $state<UserView[]>([])
  let today = $state('')
  let loading = $state(true)
  let loadError = $state('')
  let busyId = $state<number | null>(null)

  type Filter = 'all' | 'warn' | 'blocked'
  let filter = $state<Filter>('all')
  let query = $state('')

  // Diálogos
  let creating = $state(false)
  let paying = $state<UserView | null>(null)
  let credentials = $state<{ username: string; displayName: string; password: string; title: string } | null>(null)

  const onlyClients = $derived(clients.filter((c) => c.role === 'client'))
  const badge = (c: UserView) => subscriptionBadge(c, today)
  const isBlocked = (c: UserView) => c.status !== 'active'
  const isWarn = (c: UserView) => !isBlocked(c) && badge(c).tone === 'warn'

  const counts = $derived({
    total: onlyClients.length,
    active: onlyClients.filter((c) => !isBlocked(c)).length,
    warn: onlyClients.filter(isWarn).length,
    blocked: onlyClients.filter(isBlocked).length,
  })

  const visible = $derived(
    onlyClients.filter(
      (c) =>
        (filter === 'all' || (filter === 'warn' ? isWarn(c) : isBlocked(c))) &&
        (!query || foldText(`${c.displayName} ${c.username}`).includes(foldText(query))),
    ),
  )

  async function load() {
    loading = true
    loadError = ''
    try {
      const res = await clientsApi.listClients()
      clients = res.users
      today = res.today
    } catch (e) {
      loadError = e instanceof ApiError ? e.message : 'No se pudo cargar la lista.'
    } finally {
      loading = false
    }
  }
  void load()

  function replace(user: UserView) {
    const i = clients.findIndex((c) => c.id === user.id)
    if (i >= 0) clients[i] = user
    else clients.push(user)
  }

  /** Ejecuta una acción sobre un cliente con indicador de carga y aviso del resultado. */
  async function act(c: UserView, action: () => Promise<{ user: UserView; tempPassword?: string }>, done: string) {
    busyId = c.id
    try {
      const res = await action()
      replace(res.user)
      if (res.tempPassword) {
        credentials = {
          username: res.user.username,
          displayName: res.user.displayName,
          password: res.tempPassword,
          title: 'Nueva clave temporal',
        }
      } else toast(done)
    } catch (e) {
      toast(e instanceof ApiError ? e.message : 'No se pudo completar la acción')
    } finally {
      busyId = null
    }
  }

  const toggleSuspend = (c: UserView) => {
    if (!c.suspended && !confirm(`¿Suspender a ${c.displayName}? No podrá usar la app hasta que lo habilites.`)) return
    void act(
      c,
      () => clientsApi.setSuspended(c.id, !c.suspended),
      c.suspended ? 'Cliente habilitado' : 'Cliente suspendido',
    )
  }
  const resetPassword = (c: UserView) => {
    if (!confirm(`¿Generar una clave temporal nueva para ${c.displayName}? Se cerrará su sesión actual.`)) return
    void act(c, () => clientsApi.resetPassword(c.id), '')
  }
  const release = (c: UserView) => {
    if (!confirm(`¿Cerrar la sesión de ${c.displayName} en ${c.device?.name}? Podrá entrar desde otro dispositivo.`))
      return
    void act(c, () => clientsApi.releaseDevice(c.id), 'Dispositivo liberado')
  }

  async function create(username: string, displayName: string) {
    const res = await clientsApi.createClient(username, displayName)
    replace(res.user)
    creating = false
    credentials = {
      username: res.user.username,
      displayName: res.user.displayName,
      password: res.tempPassword,
      title: 'Cliente creado',
    }
  }

  async function pay(months: number) {
    if (!paying) return
    const c = paying
    await act(c, () => clientsApi.registerPayment(c.id, months), 'Pago registrado')
    paying = null
  }

  const shortDate = (d: string) => (d ? formatLongDate(dayKeyToDate(d)).replace(/^\w+, /, '') : '—')
  const lastSeen = (ms: number) =>
    ms ? `${formatLongDate(new Date(ms)).replace(/^\w+, /, '')}, ${formatClock(ms)}` : 'Nunca'
</script>

<section class="space-y-4">
  <div class="grid grid-cols-2 gap-2 sm:grid-cols-4">
    {#each [{ n: counts.total, t: 'Clientes', c: 'text-zinc-900 dark:text-zinc-100' }, { n: counts.active, t: 'Activos', c: 'text-emerald-600' }, { n: counts.warn, t: 'Por vencer', c: 'text-amber-500' }, { n: counts.blocked, t: 'Bloqueados', c: 'text-red-600' }] as s (s.t)}
      <div class="card p-3!">
        <p class={['text-3xl font-black tabular-nums', s.c]}>{s.n}</p>
        <p class="text-xs font-bold tracking-wide text-zinc-500 uppercase">{s.t}</p>
      </div>
    {/each}
  </div>

  <div class="flex flex-col gap-2 sm:flex-row">
    <label class="relative block flex-1">
      <Icon name="search" class="pointer-events-none absolute top-3.5 left-4 size-5 text-zinc-400" />
      <input
        class="field bg-white pl-11 dark:bg-zinc-900"
        type="search"
        placeholder="Buscar cliente"
        bind:value={query}
      />
    </label>
    <button type="button" class="chip chip-on h-12 gap-2 px-5" onclick={() => (creating = true)}>
      <Icon name="userPlus" />Nuevo cliente
    </button>
  </div>

  <SegmentedControl
    bind:value={filter}
    label="Filtrar clientes"
    options={[
      { id: 'all', label: 'Todos' },
      { id: 'warn', label: `Por vencer (${counts.warn})` },
      { id: 'blocked', label: `Bloqueados (${counts.blocked})` },
    ]}
  />

  {#if loading}
    <p class="py-10 text-center text-zinc-400">Cargando…</p>
  {:else if loadError}
    <div class="card space-y-3 text-center">
      <p class="font-semibold text-red-600">{loadError}</p>
      <button type="button" class="chip mx-auto h-10 px-4" onclick={load}>Reintentar</button>
    </div>
  {:else if visible.length === 0}
    <div class="py-10 text-center text-zinc-400">
      <Icon name="users" class="mx-auto size-12 opacity-50" />
      <p class="mt-2 font-semibold">{onlyClients.length ? 'Sin resultados' : 'Todavía no hay clientes'}</p>
    </div>
  {:else}
    <!-- Celular: tarjetas. Pantallas anchas: tabla. -->
    <ul class="space-y-3 lg:hidden">
      {#each visible as c (c.id)}
        <li class={['card space-y-3', busyId === c.id && 'opacity-60']}>
          <div class="flex items-start justify-between gap-3">
            <div class="min-w-0">
              <p class="truncate text-lg font-black">{c.displayName}</p>
              <p class="truncate font-mono text-sm text-zinc-500">{c.username}</p>
            </div>
            <SubscriptionPill badge={badge(c)} />
          </div>
          <dl class="grid grid-cols-2 gap-2 text-sm">
            <div>
              <dt class="text-zinc-400">Vence</dt>
              <dd class="font-semibold">{shortDate(c.paidUntil)}</dd>
            </div>
            <div>
              <dt class="text-zinc-400">Dispositivo</dt>
              <dd class="truncate font-semibold">{c.device?.name ?? 'Sin sesión'}</dd>
            </div>
            <div class="col-span-2">
              <dt class="text-zinc-400">Último uso</dt>
              <dd>{lastSeen(c.lastSeenAt)}</dd>
            </div>
          </dl>
          {#if c.mustChangePassword}
            <p class="flex items-center gap-2 text-xs font-semibold text-amber-600">
              <Icon name="key" class="size-4" />Aún no cambia su clave temporal
            </p>
          {/if}
          {@render actions(c)}
        </li>
      {/each}
    </ul>

    <div class="card hidden overflow-x-auto p-0! lg:block">
      <table class="w-full text-left text-sm">
        <thead class="border-b border-zinc-100 text-xs tracking-wide text-zinc-500 uppercase dark:border-zinc-800">
          <tr>
            <th class="px-4 py-3">Cliente</th>
            <th class="px-4 py-3">Estado</th>
            <th class="px-4 py-3">Vence</th>
            <th class="px-4 py-3">Dispositivo</th>
            <th class="px-4 py-3">Último uso</th>
            <th class="px-4 py-3 text-right">Acciones</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-zinc-100 dark:divide-zinc-800">
          {#each visible as c (c.id)}
            <tr class={[busyId === c.id && 'opacity-60']}>
              <td class="px-4 py-3">
                <p class="font-bold">{c.displayName}</p>
                <p class="font-mono text-xs text-zinc-500">{c.username}</p>
                {#if c.mustChangePassword}<p class="text-xs font-semibold text-amber-600">Clave temporal</p>{/if}
              </td>
              <td class="px-4 py-3"><SubscriptionPill badge={badge(c)} /></td>
              <td class="px-4 py-3 whitespace-nowrap">{shortDate(c.paidUntil)}</td>
              <td class="px-4 py-3">{c.device?.name ?? '—'}</td>
              <td class="px-4 py-3 whitespace-nowrap text-zinc-500">{lastSeen(c.lastSeenAt)}</td>
              <td class="px-4 py-3">{@render actions(c, true)}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {/if}
</section>

{#snippet actions(c: UserView, compact = false)}
  <div class={['flex flex-wrap gap-2', compact && 'justify-end']}>
    <button
      type="button"
      class="chip h-10 gap-1 bg-emerald-600! px-3 text-sm text-white!"
      disabled={busyId === c.id}
      onclick={() => (paying = c)}
    >
      <Icon name="coins" class="size-4" />Pago
    </button>
    <button
      type="button"
      class="chip h-10 gap-1 px-3 text-sm"
      disabled={busyId === c.id}
      onclick={() => toggleSuspend(c)}
    >
      <Icon name={c.suspended ? 'check' : 'ban'} class="size-4" />{c.suspended ? 'Habilitar' : 'Suspender'}
    </button>
    <button
      type="button"
      class="chip h-10 gap-1 px-3 text-sm"
      disabled={busyId === c.id}
      onclick={() => resetPassword(c)}
    >
      <Icon name="key" class="size-4" />Clave
    </button>
    {#if c.device}
      <button type="button" class="chip h-10 gap-1 px-3 text-sm" disabled={busyId === c.id} onclick={() => release(c)}>
        <Icon name="smartphone" class="size-4" />Liberar
      </button>
    {/if}
  </div>
{/snippet}

<Dialog open={creating} title="Nuevo cliente" onClose={() => (creating = false)}>
  {#if creating}<NewClientForm onSubmit={create} />{/if}
</Dialog>

<Dialog open={!!paying} title="Registrar pago" onClose={() => (paying = null)}>
  {#if paying}<PaymentForm client={paying} {today} onSubmit={pay} />{/if}
</Dialog>

<Dialog open={!!credentials} title={credentials?.title ?? ''} onClose={() => (credentials = null)}>
  {#if credentials}
    <CredentialsCard
      username={credentials.username}
      displayName={credentials.displayName}
      password={credentials.password}
    />
  {/if}
</Dialog>
