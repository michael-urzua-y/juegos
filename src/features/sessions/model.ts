// Reglas de negocio de un turno, sin dependencias de Svelte ni del navegador.
// Cada turno guarda su hora de término (endsAt); el tiempo restante siempre se
// calcula como endsAt - ahora, así que recargar o bloquear la pantalla no lo desfasa.

import type { Plan } from '@/features/settings'
import { LIMITS } from '@/shared/config'
import { clampInt, cleanText, isFiniteNumber, isRecord, positiveInt } from '@/shared/lib/sanitize'
import { DAY, minutesToMs } from '@/shared/lib/time'

export type SessionStatus = 'running' | 'paused' | 'alarm' | 'done'

export interface Session {
  id: string
  name: string
  game: string
  /** Minutos contratados en total (incluye extensiones). */
  minutes: number
  /** Monto total cobrado (incluye extensiones). */
  price: number
  startedAt: number
  /** Hora de término. Vale para 'running' y 'alarm'. */
  endsAt: number
  /** Tiempo restante congelado. Vale para 'paused'. */
  pausedRemainingMs: number
  /** Ya se dio el aviso previo al término. */
  warned: boolean
  status: SessionStatus
  finishedAt: number | null
}

export type Tone = 'ok' | 'warn' | 'alarm' | 'paused' | 'done'

export const STATUS_LABEL: Record<SessionStatus, string> = {
  running: 'Jugando',
  paused: 'En pausa',
  alarm: 'Tiempo',
  done: 'Terminado',
}

export interface NewSessionInput {
  name: string
  game: string
  plan: Plan
}

export function createSession(input: NewSessionInput, now: number, warnMs: number, id: string): Session | null {
  const name = cleanText(input.name, LIMITS.nameMaxLength)
  const minutes = positiveInt(input.plan.minutes, LIMITS.minutesMax)
  if (!name || !minutes) return null
  const durationMs = minutesToMs(minutes)
  return {
    id,
    name,
    game: cleanText(input.game, LIMITS.gameMaxLength),
    minutes,
    price: clampInt(input.plan.price, 0, LIMITS.priceMax, 0),
    startedAt: now,
    endsAt: now + durationMs,
    pausedRemainingMs: 0,
    warned: durationMs <= warnMs,
    status: 'running',
    finishedAt: null,
  }
}

export const isActive = (s: Session) => s.status !== 'done'

export function remainingMs(s: Session, now: number): number {
  switch (s.status) {
    case 'running':
    case 'alarm':
      return s.endsAt - now
    case 'paused':
      return s.pausedRemainingMs
    case 'done':
      return 0
  }
}

/** Fracción de tiempo restante, de 0 a 1. */
export function progress(s: Session, now: number): number {
  return Math.min(1, Math.max(0, remainingMs(s, now) / minutesToMs(s.minutes)))
}

export function sessionTone(s: Session, now: number, warnMs: number): Tone {
  if (s.status === 'running') return remainingMs(s, now) <= warnMs ? 'warn' : 'ok'
  return s.status === 'alarm' ? 'alarm' : s.status
}

/** Orden en pantalla: alarmas primero, luego el que sale antes, y los pausados al final. */
export function compareActive(a: Session, b: Session): number {
  const rank = (s: Session) => ({ alarm: 0, running: 1, paused: 2, done: 3 })[s.status]
  const key = (s: Session) => (s.status === 'paused' ? s.pausedRemainingMs : s.endsAt)
  return rank(a) - rank(b) || key(a) - key(b)
}

// ---------- Transiciones (modifican el turno recibido) ----------

export function extendSession(s: Session, now: number, extra: Plan, warnMs: number): void {
  if (s.status === 'done') return
  const addMs = minutesToMs(extra.minutes)
  if (s.status === 'alarm') {
    s.endsAt = now + addMs
    s.status = 'running'
    s.finishedAt = null
  } else if (s.status === 'running') {
    s.endsAt += addMs
  } else {
    s.pausedRemainingMs += addMs
  }
  s.minutes += extra.minutes
  s.price += extra.price
  s.warned = remainingMs(s, now) <= warnMs
}

export function pauseSession(s: Session, now: number): void {
  if (s.status !== 'running') return
  s.pausedRemainingMs = Math.max(0, s.endsAt - now)
  s.status = 'paused'
}

export function resumeSession(s: Session, now: number): void {
  if (s.status !== 'paused') return
  s.endsAt = now + s.pausedRemainingMs
  s.status = 'running'
}

/** Termina el turno: confirma una alarma o corta antes de tiempo. */
export function finishSession(s: Session, now: number): void {
  if (s.status === 'done') return
  s.finishedAt ??= now
  s.status = 'done'
}

/** Avanza el reloj de un turno. Devuelve qué evento ocurrió, si hubo alguno. */
export function advanceSession(s: Session, now: number, warnMs: number): 'ended' | 'warned' | null {
  if (s.status !== 'running') return null
  const left = s.endsAt - now
  if (left <= 0) {
    s.status = 'alarm'
    s.finishedAt = s.endsAt
    return 'ended'
  }
  if (warnMs > 0 && !s.warned && left <= warnMs) {
    s.warned = true
    return 'warned'
  }
  return null
}

// ---------- Lectura desde almacenamiento ----------

const STATUSES: readonly SessionStatus[] = ['running', 'paused', 'alarm', 'done']

export function parseSession(raw: unknown): Session | null {
  if (!isRecord(raw)) return null
  const { id, status, startedAt, endsAt } = raw
  if (typeof id !== 'string' || !id || id.length > 64) return null
  if (!STATUSES.includes(status as SessionStatus)) return null
  if (!isFiniteNumber(startedAt) || !isFiniteNumber(endsAt)) return null
  const name = cleanText(raw.name, LIMITS.nameMaxLength)
  if (!name) return null
  // Los montos acumulan extensiones, por eso el tope es mayor que el de un plan.
  const minutes = positiveInt(raw.minutes, LIMITS.minutesMax * 10)
  if (!minutes) return null
  return {
    id,
    name,
    game: cleanText(raw.game, LIMITS.gameMaxLength),
    minutes,
    price: clampInt(raw.price, 0, LIMITS.priceMax * 10, 0),
    startedAt,
    endsAt,
    pausedRemainingMs: clampInt(raw.pausedRemainingMs, 0, minutesToMs(minutes), 0),
    warned: raw.warned === true,
    status: status as SessionStatus,
    finishedAt: isFiniteNumber(raw.finishedAt) ? raw.finishedAt : null,
  }
}

/** Valida lo leído: descarta entradas inválidas o repetidas. */
export function parseSessions(raw: unknown): Session[] {
  if (!Array.isArray(raw)) return []
  const seen = new Set<string>()
  const result: Session[] = []
  for (const item of raw) {
    const s = parseSession(item)
    if (!s || seen.has(s.id)) continue
    seen.add(s.id)
    result.push(s)
  }
  return result.slice(-LIMITS.maxStoredSessions)
}

/** Turnos terminados más antiguos que el período de detalle; se archivan como totales diarios. */
export function isExpired(s: Session, now: number): boolean {
  return s.status === 'done' && s.startedAt < now - LIMITS.historyDays * DAY
}
