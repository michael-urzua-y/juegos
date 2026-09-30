// Sincroniza los datos del celular (turnos, caja, ajustes) con el servidor.
//
// La app sigue funcionando sin internet: el celular es la fuente de verdad mientras la sesión
// está abierta (solo un dispositivo por cuenta) y sube los cambios cuando hay conexión.
// Al iniciar sesión se decide qué datos quedan: los del servidor o los del celular.

import { exportArchive, importArchive } from '@/features/reports'
import { exportSessions, importSessions } from '@/features/sessions'
import { exportSettings, importSettings } from '@/features/settings'
import { api, ApiError } from '@/shared/lib/api'
import { readJSON, writeJSON } from '@/shared/lib/storage'

const OWNER_KEY = 'owner' // id del usuario dueño de los datos guardados en este celular
const VERSION_KEY = 'version' // última versión del servidor que tiene este celular
const DIRTY_KEY = 'dirty' // hay cambios sin subir
const BACKUP_KEY = 'backup' // copia local si el servidor tenía datos más nuevos al iniciar sesión

const PUSH_DELAY_MS = 3_000
const RETRY_MS = 60_000

interface AppData {
  sessions: unknown
  archive: unknown
  settings: unknown
}

interface DataResponse {
  data: AppData | null
  version: number
  updatedAt: number
}

export const syncState = $state({
  status: 'idle' as 'idle' | 'saving' | 'saved' | 'offline' | 'error',
  lastSyncedAt: 0,
})

const snapshot = (): AppData => ({ sessions: exportSessions(), archive: exportArchive(), settings: exportSettings() })

/** Estado serializado de los datos: sirve para detectar cambios reales. */
export const dataFingerprint = () => JSON.stringify(snapshot())

let ready = false
let lastFingerprint = ''
let timer: ReturnType<typeof setTimeout> | undefined
let onRejected: (e: ApiError) => void = () => {}

const isDirty = () => readJSON(DIRTY_KEY) === true
const setDirty = (dirty: boolean) => writeJSON(DIRTY_KEY, dirty)

function applyData(data: AppData | null): void {
  importSessions(data?.sessions)
  importArchive(data?.archive)
  importSettings(data?.settings)
  lastFingerprint = dataFingerprint()
}

function schedule(delay = PUSH_DELAY_MS): void {
  clearTimeout(timer)
  timer = setTimeout(() => void push(), delay)
}

/** Sube los cambios pendientes. Devuelve true si quedó todo guardado en el servidor. */
export async function push(): Promise<boolean> {
  clearTimeout(timer)
  if (!ready || !isDirty()) return true
  syncState.status = 'saving'
  try {
    const saved = await api<DataResponse>('PUT', '/data', { data: snapshot() })
    writeJSON(VERSION_KEY, saved.version)
    setDirty(false)
    syncState.status = 'saved'
    syncState.lastSyncedAt = Date.now()
    return true
  } catch (e) {
    if (e instanceof ApiError && !e.offline) {
      syncState.status = 'error'
      onRejected(e) // sesión cerrada, suspendida o vencida: la app revisa el estado
    } else {
      syncState.status = 'offline'
    }
    schedule(RETRY_MS)
    return false
  }
}

/** Avisa que cambió algo en los datos locales (lo llama un $effect en el arranque). */
export function noteLocalChange(fingerprint: string): void {
  if (!ready || fingerprint === lastFingerprint) return
  lastFingerprint = fingerprint
  setDirty(true)
  schedule()
}

/**
 * Al iniciar sesión: deja en el celular los datos correctos de esta cuenta.
 * - Celular de otra cuenta → se reemplazan por los del servidor (o se vacían).
 * - Primera vez de esta cuenta → se suben los datos que ya había en el celular.
 * - El servidor tiene algo más nuevo (se usó otro dispositivo) → gana el servidor.
 */
export async function connectAccount(userId: number): Promise<void> {
  const server = await api<DataResponse>('GET', '/data')
  const owner = readJSON(OWNER_KEY)
  const localVersion = Number(readJSON(VERSION_KEY)) || 0

  if (owner !== userId) {
    if (server.data) applyData(server.data)
    else if (owner != null) applyData(null) // datos de otra cuenta: no se mezclan
    setDirty(!server.data)
  } else if (server.version > localVersion) {
    if (isDirty()) writeJSON(BACKUP_KEY, snapshot())
    applyData(server.data)
    setDirty(false)
  }
  writeJSON(OWNER_KEY, userId)
  writeJSON(VERSION_KEY, server.version)
  resume(userId)
}

/** Con la sesión ya abierta (p. ej. al abrir la app sin internet): sigue sincronizando. */
export function resume(userId: number): boolean {
  if (readJSON(OWNER_KEY) !== userId) return false
  lastFingerprint = dataFingerprint()
  ready = true
  if (isDirty()) void push()
  return true
}

/** Al cerrar sesión: vacía los datos del celular para que el siguiente usuario parta limpio. */
export function clearLocalData(): void {
  ready = false
  clearTimeout(timer)
  applyData(null)
  writeJSON(OWNER_KEY, null)
  writeJSON(VERSION_KEY, 0)
  setDirty(false)
  syncState.status = 'idle'
}

export const hasPendingChanges = isDirty

/** Reintenta al recuperar conexión. `rejected` recibe los rechazos del servidor. */
export function startSync(rejected: (e: ApiError) => void): void {
  onRejected = rejected
  window.addEventListener('online', () => void push())
}
