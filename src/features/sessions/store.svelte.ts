// Estado reactivo de los turnos. La lógica vive en model.ts; aquí solo se aplica y se guarda.

import { settings, warnThresholdMs, type Plan } from '@/features/settings'
import { newId } from '@/shared/lib/id'
import { readJSON, writeJSON } from '@/shared/lib/storage'
import {
  advanceSession,
  compareActive,
  createSession,
  extendSession,
  finishSession,
  isActive,
  parseSessions,
  pauseSession,
  resumeSession,
  type Session,
} from './model'

const STORAGE_KEY = 'sessions'

export const sessions: Session[] = $state(parseSessions(readJSON(STORAGE_KEY), Date.now()))

// ---------- Consultas ----------

export const activeSessions = () => sessions.filter(isActive).sort(compareActive)
export const alarmSessions = () => sessions.filter((s) => s.status === 'alarm')
export const hasActiveSessions = () => sessions.some(isActive)

// ---------- Acciones ----------

const byId = (id: string) => sessions.find((s) => s.id === id)

/** Aplica una transición del modelo a un turno por id. */
const withSession =
  (fn: (s: Session, now: number) => void) =>
  (id: string): void => {
    const s = byId(id)
    if (s) fn(s, Date.now())
  }

export function startSession(name: string, game: string, plan: Plan): boolean {
  const session = createSession({ name, game, plan }, Date.now(), warnThresholdMs(), newId())
  if (session) sessions.push(session)
  return session !== null
}

export const extend = withSession((s, now) =>
  extendSession(s, now, { minutes: settings.extendMinutes, price: settings.extendPrice }, warnThresholdMs()),
)
export const pause = withSession(pauseSession)
export const resume = withSession(resumeSession)
export const finish = withSession(finishSession)

export function finishAllAlarms(): void {
  const now = Date.now()
  for (const s of alarmSessions()) finishSession(s, now)
}

export function removeSession(id: string): void {
  const i = sessions.findIndex((s) => s.id === id)
  if (i >= 0) sessions.splice(i, 1)
}

export function clearHistory(): void {
  const keep = sessions.filter(isActive)
  sessions.splice(0, sessions.length, ...keep)
}

/** Avanza todos los turnos al instante `now` y devuelve los que terminaron o entraron al aviso. */
export function advanceAll(now: number): { ended: Session[]; warned: Session[] } {
  const warnMs = warnThresholdMs()
  const ended: Session[] = []
  const warned: Session[] = []
  for (const s of sessions) {
    const event = advanceSession(s, now, warnMs)
    if (event === 'ended') ended.push(s)
    else if (event === 'warned') warned.push(s)
  }
  return { ended, warned }
}

/** Guarda los turnos en cada cambio. Llamar dentro de un $effect.root. */
export function persistSessions(): void {
  $effect(() => writeJSON(STORAGE_KEY, sessions))
}
