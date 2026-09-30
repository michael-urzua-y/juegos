// Sesión del usuario. El servidor es la autoridad: aquí solo se guarda una copia de "quién soy"
// para que la app abra sin internet. El token real está en una cookie HttpOnly que JS no ve.

import { api, ApiError } from '@/shared/lib/api'
import { isRecord } from '@/shared/lib/sanitize'
import { readJSON, writeJSON } from '@/shared/lib/storage'
import type { Me } from './types'

const STORAGE_KEY = 'me'

function parseMe(raw: unknown): Me | null {
  if (!isRecord(raw) || !isRecord(raw.user)) return null
  const u = raw.user
  if (typeof u.id !== 'number' || typeof u.username !== 'string' || typeof u.displayName !== 'string') return null
  return raw as unknown as Me
}

export const auth = $state({ me: parseMe(readJSON(STORAGE_KEY)) })

export function setMe(me: Me | null): void {
  auth.me = me
  writeJSON(STORAGE_KEY, me)
}

export const isAdmin = () => auth.me?.user.role === 'admin'

export async function login(username: string, password: string): Promise<Me> {
  const me = await api<Me>('POST', '/auth/login', { username, password })
  setMe(me)
  return me
}

/**
 * Consulta el estado actual (suspensión, vencimiento, clave temporal).
 * Sin conexión se mantiene la copia guardada; si la sesión ya no es válida, se cierra.
 */
export async function refreshMe(): Promise<void> {
  try {
    setMe(await api<Me>('GET', '/me'))
  } catch (e) {
    if (e instanceof ApiError && e.status === 401) setMe(null)
  }
}

export async function changePassword(currentPassword: string, newPassword: string): Promise<void> {
  setMe(await api<Me>('POST', '/auth/password', { currentPassword, newPassword }))
}

/** Cierra la sesión en el servidor (libera el dispositivo). Requiere conexión. */
export const logoutRequest = () => api<void>('POST', '/auth/logout')
