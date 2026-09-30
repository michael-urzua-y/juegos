// Rutas con hash (#/activos): funciona en cualquier hosting estático y el botón
// "atrás" de Android navega dentro de la app.

import type { AdminPage } from '@/features/admin'
import type { IconName } from '@/shared/ui/Icon.svelte'

export type Tab = 'new' | 'active' | 'admin'
export type RouteId = Tab | `admin/${AdminPage}`

interface Route {
  path: string
  title: string
  tab: Tab
  parent?: RouteId
  /** Usa todo el ancho en pantallas grandes (tablas). */
  wide?: boolean
}

export const ROUTES: Record<RouteId, Route> = {
  new: { path: '/nuevo', title: 'Nuevo niño', tab: 'new' },
  active: { path: '/activos', title: 'Activos', tab: 'active' },
  admin: { path: '/admin', title: 'Admin', tab: 'admin' },
  'admin/cash': { path: '/admin/caja', title: 'Caja del día', tab: 'admin', parent: 'admin' },
  'admin/games': { path: '/admin/juegos', title: 'Juegos', tab: 'admin', parent: 'admin' },
  'admin/plans': { path: '/admin/tiempos', title: 'Tiempos y precios', tab: 'admin', parent: 'admin' },
  'admin/alarm': { path: '/admin/alarma', title: 'Alarma y sonido', tab: 'admin', parent: 'admin' },
  'admin/account': { path: '/admin/cuenta', title: 'Mi cuenta', tab: 'admin', parent: 'admin' },
  'admin/clients': { path: '/admin/clientes', title: 'Clientes', tab: 'admin', parent: 'admin', wide: true },
}

export const TABS: readonly { id: Tab; label: string; icon: IconName }[] = [
  { id: 'new', label: 'Nuevo', icon: 'userPlus' },
  { id: 'active', label: 'Activos', icon: 'timer' },
  { id: 'admin', label: 'Admin', icon: 'settings' },
]

const HOME: RouteId = 'new'
const ids = Object.keys(ROUTES) as RouteId[]

function fromLocation(): RouteId {
  const path = location.hash.slice(1)
  return ids.find((id) => ROUTES[id].path === path) ?? HOME
}

export const router = $state({ route: fromLocation() })

export const currentRoute = () => ROUTES[router.route]

/**
 * Navega a una ruta. Las subpáginas se apilan (atrás vuelve al menú);
 * el cambio de pestaña reemplaza la entrada para no llenar el historial.
 */
export function go(id: RouteId, { replace = false } = {}): void {
  if (id === router.route) return
  const url = `#${ROUTES[id].path}`
  if (replace) history.replaceState(history.state, '', url)
  else history.pushState({ inApp: true }, '', url)
  router.route = id
  window.scrollTo(0, 0)
}

export const goTab = (tab: Tab) => go(tab, { replace: true })

export function back(): void {
  if (history.state?.inApp) history.back()
  else go(ROUTES[router.route].parent ?? HOME, { replace: true })
}

if (typeof window !== 'undefined') {
  const sync = () => (router.route = fromLocation())
  window.addEventListener('popstate', sync)
  window.addEventListener('hashchange', sync)
}
