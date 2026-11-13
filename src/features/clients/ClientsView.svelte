<script lang="ts">
  import { daysUntil, subscriptionBadge, SubscriptionPill, type UserView } from '@/features/auth'
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
  import DeleteClientForm from './components/DeleteClientForm.svelte'
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
  let managing = $state<UserView | null>(null)
  let deleting = $state<UserView | null>(null)

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

  const shortDate = (d: string) => (d ? formatLongDate(dayKeyToDate(d)).replace(/^[^,]+, /, '') : '—')
  const lastSeen = (ms: number) =>
    ms ? `${formatLongDate(new Date(ms)).replace(/^[^,]+, /, '')}, ${formatClock(ms)}` : 'Nunca'

  async function remove() {
    if (!deleting) return
    const c = deleting
    try {
      await clientsApi.deleteClient(c.id)
      clients = clients.filter((x) => x.id !== c.id)
      deleting = null
      toast(`${c.displayName} eliminado`)
    } catch (e) {
      toast(e instanceof ApiError ? e.message : 'No se pudo eliminar')
    }
  }

  /** Acción del menú de un cliente: cierra el menú y la ejecuta. */
  function fromMenu(run: (c: UserView) => void) {
    const c = managing
    managing = null
    if (c) run(c)
  }

  const initials = (name: string) =>
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase())
      .join('')

  /** Días de servicio restantes, como barra de 0 a 30 días. */
  const remaining = (c: UserView) => {
    const days = c.paidUntil && today ? daysUntil(c.paidUntil, today) : 0
    return { days, pct: Math.max(0, Math.min(100, (days / 30) * 100)) }
  }
  const barColor = (c: UserView) =>
    isBlocked(c) ? 'bg-red-500' : isWarn(c) ? 'bg-amber-400' : 'bg-gradient-to-r from-orange-500 to-amber-400'
</script>

<section class="space-y-4">
  <!-- Encabezado con la marca: colibrí naranjo sobre fondo oscuro, como el logo -->
  <header
    class="relative overflow-hidden rounded-3xl bg-[#0c0a09] p-5 text-white shadow-xl shadow-orange-950/20 ring-1 ring-white/10"
  >
    <div class="pointer-events-none absolute -top-16 -right-10 size-56 rounded-full bg-orange-500/30 blur-3xl"></div>
    <div class="pointer-events-none absolute -bottom-20 -left-10 size-48 rounded-full bg-amber-500/10 blur-3xl"></div>
    <div class="relative flex items-center gap-3">
      <img
        src="/logo.webp"
        alt=""
        width="240"
        height="222"
        class="h-12 w-auto drop-shadow-[0_0_12px_rgba(249,115,22,0.45)]"
      />
      <div class="min-w-0">
        <p class="text-xs font-bold tracking-[0.2em] text-orange-400 uppercase">Monay Solutions</p>
        <p class="text-xl font-black">Panel de clientes</p>
      </div>
    </div>
    <div class="relative mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
      {#each [{ n: counts.total, t: 'Clientes', dot: 'bg-white' }, { n: counts.active, t: 'Activos', dot: 'bg-emerald-400' }, { n: counts.warn, t: 'Por vencer', dot: 'bg-amber-400' }, { n: counts.blocked, t: 'Bloqueados', dot: 'bg-red-500' }] as k (k.t)}
        <div class="flex items-center gap-3 rounded-2xl bg-white/6 px-3 py-2.5 ring-1 ring-white/10 backdrop-blur">
          <p class="text-2xl font-black tabular-nums">{k.n}</p>
          <p class="flex min-w-0 items-center gap-1.5 text-xs leading-tight font-bold text-white/60">
            <span class={['size-1.5 shrink-0 rounded-full', k.dot]}></span>{k.t}
          </p>
        </div>
      {/each}
    </div>
  </header>

  <div class="flex gap-2">
    <label class="relative block flex-1">
      <Icon name="search" class="pointer-events-none absolute top-3.5 left-4 size-5 text-zinc-400" />
      <input
        class="field bg-white pl-11 dark:bg-zinc-900"
        type="search"
        placeholder="Buscar cliente"
        bind:value={query}
      />
    </label>
    <button
      type="button"
      class="flex h-12 shrink-0 items-center gap-2 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-500 px-4 font-black text-white shadow-lg shadow-orange-500/30 active:scale-95"
      onclick={() => (creating = true)}
    >
      <Icon name="userPlus" /><span class="hidden sm:inline">Nuevo cliente</span><span class="sm:hidden">Nuevo</span>
    </button>
  </div>

  <SegmentedControl
    bind:value={filter}
    label="Filtrar clientes"
    options={[
      { id: 'all', label: `Todos (${counts.total})` },
      { id: 'warn', label: `Por vencer (${counts.warn})` },
      { id: 'blocked', label: `Bloqueados (${counts.blocked})` },
    ]}
  />

  {#if loading}
    <ul class="grid gap-3 lg:grid-cols-2">
      {#each [1, 2, 3] as i (i)}
        <li class="card h-40 animate-pulse"></li>
      {/each}
    </ul>
  {:else if loadError}
    <div class="card space-y-3 text-center">
      <p class="font-semibold text-red-600">{loadError}</p>
      <button type="button" class="chip mx-auto h-10 px-4" onclick={load}>Reintentar</button>
    </div>
  {:else if visible.length === 0}
    <div class="card py-10 text-center text-zinc-400">
      <div class="mx-auto grid size-16 place-items-center rounded-full bg-orange-500/10 text-orange-500">
        <Icon name="users" class="size-8" />
      </div>
      <p class="mt-3 font-bold text-zinc-600 dark:text-zinc-300">
        {onlyClients.length ? 'Sin resultados' : 'Todavía no hay clientes'}
      </p>
      {#if !onlyClients.length}
        <p class="mt-1 text-sm">Crea el primero con «Nuevo».</p>
      {/if}
    </div>
  {:else}
    <ul class="grid gap-3 lg:grid-cols-2">
      {#each visible as c (c.id)}
        {@const left = remaining(c)}
        <li class={['card space-y-4 transition', busyId === c.id && 'pointer-events-none opacity-60']}>
          <div class="flex items-center gap-3">
            <div
              class={[
                'grid size-12 shrink-0 place-items-center rounded-2xl text-lg font-black text-white shadow-md',
                isBlocked(c)
                  ? 'bg-zinc-400 dark:bg-zinc-700'
                  : 'bg-gradient-to-br from-orange-500 to-amber-500 shadow-orange-500/30',
              ]}
              aria-hidden="true"
            >
              {initials(c.displayName)}
            </div>
            <div class="min-w-0 flex-1">
              <p class="truncate text-lg leading-tight font-black">{c.displayName}</p>
              <p class="truncate font-mono text-sm text-zinc-500">{c.username}</p>
            </div>
            <button
              type="button"
              class="grid size-10 shrink-0 place-items-center rounded-full text-zinc-500 active:bg-zinc-100 dark:active:bg-zinc-800"
              aria-label="Más acciones para {c.displayName}"
              onclick={() => (managing = c)}
            >
              <Icon name="more" />
            </button>
          </div>

          <div class="space-y-1.5">
            <div class="flex items-center justify-between gap-2 text-sm">
              <SubscriptionPill badge={badge(c)} />
              <span class="text-zinc-500"
                >Vence <b class="text-zinc-800 dark:text-zinc-200">{shortDate(c.paidUntil)}</b></span
              >
            </div>
            <div class="h-2 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
              <div class={['h-full rounded-full transition-all', barColor(c)]} style="width: {left.pct}%"></div>
            </div>
          </div>

          <div class="flex flex-wrap gap-x-4 gap-y-1 text-sm text-zinc-500">
            <span class="flex items-center gap-1.5">
              <Icon name="smartphone" class="size-4" />{c.device?.name ?? 'Sin sesión'}
            </span>
            <span class="flex items-center gap-1.5"><Icon name="timer" class="size-4" />{lastSeen(c.lastSeenAt)}</span>
            {#if c.mustChangePassword}
              <span class="flex items-center gap-1.5 font-semibold text-amber-600">
                <Icon name="key" class="size-4" />Clave temporal sin cambiar
              </span>
            {/if}
          </div>

          <button
            type="button"
            class="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 font-black text-white shadow-md shadow-orange-500/25 active:scale-[0.98] disabled:opacity-50"
            disabled={busyId === c.id}
            onclick={() => (paying = c)}
          >
            <Icon name="coins" class="size-5" />Registrar pago
          </button>
        </li>
      {/each}
    </ul>
  {/if}
</section>

<Dialog open={!!managing} title={managing?.displayName ?? ''} onClose={() => (managing = null)}>
  {#if managing}
    {@const c = managing}
    <div class="grid gap-2">
      <button type="button" class="chip h-14 justify-start gap-3 px-4" onclick={() => fromMenu(toggleSuspend)}>
        <Icon name={c.suspended ? 'check' : 'ban'} />{c.suspended ? 'Habilitar cuenta' : 'Suspender cuenta'}
      </button>
      <button type="button" class="chip h-14 justify-start gap-3 px-4" onclick={() => fromMenu(resetPassword)}>
        <Icon name="key" />Generar clave temporal nueva
      </button>
      {#if c.device}
        <button type="button" class="chip h-14 justify-start gap-3 px-4" onclick={() => fromMenu(release)}>
          <Icon name="smartphone" />Liberar dispositivo ({c.device.name})
        </button>
      {/if}
      <button
        type="button"
        class="chip mt-2 h-14 justify-start gap-3 bg-red-500/10! px-4 text-red-600! dark:text-red-400!"
        onclick={() => fromMenu((x) => (deleting = x))}
      >
        <Icon name="trash" />Eliminar cliente
      </button>
    </div>
  {/if}
</Dialog>

<Dialog open={!!deleting} title="Eliminar cliente" onClose={() => (deleting = null)}>
  {#if deleting}<DeleteClientForm client={deleting} onSubmit={remove} />{/if}
</Dialog>

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
