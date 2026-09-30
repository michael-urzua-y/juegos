// Coordina la sesión del usuario con los datos del celular.
// auth (quién soy) y sync (mis datos) no se conocen entre sí; la orquestación vive aquí.

import { auth, changePassword, login, logoutRequest, refreshMe, setMe } from '@/features/auth'
import { clearLocalData, connectAccount, hasPendingChanges, push, resume, startSync } from '@/features/sync'
import { ApiError } from '@/shared/lib/api'

const REFRESH_MS = 5 * 60_000

export const account = $state({
  /** Los datos de la cuenta están cargados y sincronizando. */
  ready: false,
  connecting: false,
  error: '',
})

/** La cuenta puede usar la app: sesión abierta, clave definitiva y suscripción activa. */
export const canUseApp = () => {
  const u = auth.me?.user
  return !!u && !u.mustChangePassword && u.status === 'active'
}

/** Carga los datos de la cuenta en el celular (al entrar o al abrir la app). */
export async function ensureConnected(): Promise<void> {
  const u = auth.me?.user
  if (!u || !canUseApp() || account.ready || account.connecting) return
  if (resume(u.id)) {
    account.ready = true
    return
  }
  account.connecting = true
  account.error = ''
  try {
    await connectAccount(u.id)
    account.ready = true
  } catch (e) {
    account.error = e instanceof ApiError ? e.message : 'No se pudieron cargar tus datos.'
    if (e instanceof ApiError && !e.offline) void refreshMe()
  } finally {
    account.connecting = false
  }
}

export async function signIn(username: string, password: string): Promise<void> {
  await login(username, password)
  await ensureConnected()
}

export async function updatePassword(current: string, next: string): Promise<void> {
  await changePassword(current, next)
  await ensureConnected()
}

/**
 * Cierra la sesión y libera el dispositivo. Antes sube los cambios pendientes;
 * sin conexión no se cierra, para no perder datos (salvo `force`).
 */
export async function signOut({ force = false } = {}): Promise<void> {
  const saved = await push()
  if (!saved && hasPendingChanges() && !force) {
    throw new ApiError(0, 'unsaved', 'Hay cambios sin guardar. Conéctate a internet para cerrar sesión.')
  }
  try {
    await logoutRequest()
  } catch (e) {
    // Sin sesión en el servidor (401) igual se limpia el celular; sin conexión, no.
    if (!(e instanceof ApiError && e.status === 401) && !force) throw e
  }
  account.ready = false
  clearLocalData()
  setMe(null)
}

/** Revisa el estado de la cuenta al volver a la app, al recuperar conexión y cada 5 minutos. */
export function watchAccount(): void {
  const check = () => {
    if (auth.me && navigator.onLine && document.visibilityState === 'visible') void refreshMe()
  }
  startSync(() => void refreshMe())
  document.addEventListener('visibilitychange', check)
  window.addEventListener('online', check)
  setInterval(check, REFRESH_MS)
  check()
}

/** Si el servidor cerró la sesión o bloqueó la cuenta, se deja de sincronizar. */
export function onAccountChanged(): void {
  if (!canUseApp()) account.ready = false
}
