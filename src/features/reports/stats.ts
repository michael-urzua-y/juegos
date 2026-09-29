// Cálculo de caja por día. Funciones puras: sin Svelte ni navegador.

import type { Session } from '@/features/sessions'
import { LIMITS } from '@/shared/config'
import { clampInt, cleanText, foldText, isRecord } from '@/shared/lib/sanitize'
import { dayKey, isDayKey } from '@/shared/lib/time'

export const NO_GAME = 'Sin juego'

export interface GameStats {
  game: string
  count: number
  amount: number
}

export interface DayStats {
  /** Recaudado. */
  total: number
  /** Turnos (un niño puede tener varios). */
  sessions: number
  /** Niños distintos. */
  kids: number
  minutes: number
  byGame: GameStats[]
}

export const emptyDay = (): DayStats => ({ total: 0, sessions: 0, kids: 0, minutes: 0, byGame: [] })

const byAmount = (a: GameStats, b: GameStats) => b.amount - a.amount || b.count - a.count

export function summarize(list: readonly Session[]): DayStats {
  const games = new Map<string, GameStats>()
  const kids = new Set<string>()
  const stats = emptyDay()
  for (const s of list) {
    stats.total += s.price
    stats.minutes += s.minutes
    stats.sessions++
    // Mismo niño aunque cambie mayúscula o tilde; la nota separa a dos con el mismo nombre
    kids.add(foldText(`${s.name}|${s.note}`))
    const game = s.game || NO_GAME
    const g = games.get(game) ?? { game, count: 0, amount: 0 }
    g.count++
    g.amount += s.price
    games.set(game, g)
  }
  stats.kids = kids.size
  stats.byGame = [...games.values()].sort(byAmount)
  return stats
}

/** Suma dos resúmenes (p. ej. totales archivados + turnos con detalle del mismo día). */
export function mergeStats(a: DayStats, b: DayStats): DayStats {
  const games = new Map(a.byGame.map((g) => [g.game, { ...g }]))
  for (const g of b.byGame) {
    const prev = games.get(g.game)
    games.set(g.game, prev ? { ...prev, count: prev.count + g.count, amount: prev.amount + g.amount } : { ...g })
  }
  return {
    total: a.total + b.total,
    sessions: a.sessions + b.sessions,
    kids: a.kids + b.kids,
    minutes: a.minutes + b.minutes,
    byGame: [...games.values()].sort(byAmount),
  }
}

export function groupByDay(list: readonly Session[]): Map<string, Session[]> {
  const days = new Map<string, Session[]>()
  for (const s of list) {
    const key = dayKey(s.startedAt)
    const day = days.get(key)
    if (day) day.push(s)
    else days.set(key, [s])
  }
  return days
}

// ---------- Validación del archivo guardado ----------

const MAX = LIMITS.priceMax * 10_000

function parseGameStats(raw: unknown): GameStats | null {
  if (!isRecord(raw)) return null
  const game = cleanText(raw.game, LIMITS.gameMaxLength)
  if (!game) return null
  return { game, count: clampInt(raw.count, 0, MAX, 0), amount: clampInt(raw.amount, 0, MAX, 0) }
}

export function parseDayStats(raw: unknown): DayStats | null {
  if (!isRecord(raw)) return null
  return {
    total: clampInt(raw.total, 0, MAX, 0),
    sessions: clampInt(raw.sessions, 0, MAX, 0),
    kids: clampInt(raw.kids, 0, MAX, 0),
    minutes: clampInt(raw.minutes, 0, MAX, 0),
    byGame: Array.isArray(raw.byGame)
      ? raw.byGame
          .map(parseGameStats)
          .filter((g): g is GameStats => g !== null)
          .slice(0, LIMITS.maxGames * 5)
      : [],
  }
}

export function parseArchive(raw: unknown): Record<string, DayStats> {
  const archive: Record<string, DayStats> = {}
  if (!isRecord(raw)) return archive
  for (const [key, value] of Object.entries(raw)) {
    const stats = isDayKey(key) ? parseDayStats(value) : null
    if (stats) archive[key] = stats
  }
  return archive
}
