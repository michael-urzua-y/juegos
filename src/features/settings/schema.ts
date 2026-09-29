import { LIMITS } from '@/shared/config'
import { clampInt, cleanText, isRecord, positiveInt } from '@/shared/lib/sanitize'

export interface Plan {
  minutes: number
  price: number
}

export interface Settings {
  plans: Plan[]
  games: string[]
  extendMinutes: number
  extendPrice: number
  /** Minutos antes del término para el aviso previo. 0 = desactivado. */
  warnMinutes: number
  voice: boolean
  vibrate: boolean
  /** Volumen de los pitidos, 0.1 a 1. */
  volume: number
}

export const DEFAULT_SETTINGS: Readonly<Settings> = Object.freeze({
  plans: [
    { minutes: 5, price: 1000 },
    { minutes: 10, price: 2000 },
    { minutes: 15, price: 2500 },
    { minutes: 20, price: 3000 },
  ],
  games: ['Castillo', 'Tobogán', 'Cama elástica'],
  extendMinutes: 5,
  extendPrice: 1000,
  warnMinutes: 1,
  voice: true,
  vibrate: true,
  volume: 0.9,
})

export const defaultSettings = (): Settings => structuredClone(DEFAULT_SETTINGS) as Settings

export const clampMinutes = (v: unknown, fallback: number) =>
  clampInt(v, LIMITS.minutesMin, LIMITS.minutesMax, fallback)
export const clampPrice = (v: unknown, fallback: number) => clampInt(v, 0, LIMITS.priceMax, fallback)

export function parsePlan(raw: unknown): Plan | null {
  if (!isRecord(raw)) return null
  const minutes = positiveInt(raw.minutes, LIMITS.minutesMax)
  if (!minutes) return null
  return { minutes, price: clampPrice(raw.price, 0) }
}

/** Planes válidos, sin minutos repetidos y ordenados de menor a mayor. */
export function normalizePlans(raw: unknown): Plan[] {
  if (!Array.isArray(raw)) return []
  const byMinutes = new Map<number, Plan>()
  for (const item of raw) {
    const plan = parsePlan(item)
    if (plan && !byMinutes.has(plan.minutes)) byMinutes.set(plan.minutes, plan)
  }
  return [...byMinutes.values()].sort((a, b) => a.minutes - b.minutes).slice(0, LIMITS.maxPlans)
}

export function normalizeGames(raw: unknown): string[] {
  if (!Array.isArray(raw)) return []
  const games = raw.map((g) => cleanText(g, LIMITS.gameMaxLength)).filter(Boolean)
  return [...new Set(games)].slice(0, LIMITS.maxGames)
}

/** Convierte cualquier valor (p. ej. lo leído de localStorage) en ajustes válidos. */
export function parseSettings(raw: unknown): Settings {
  const d = defaultSettings()
  if (!isRecord(raw)) return d
  const plans = normalizePlans(raw.plans)
  return {
    plans: plans.length ? plans : d.plans,
    games: Array.isArray(raw.games) ? normalizeGames(raw.games) : d.games,
    extendMinutes: clampMinutes(raw.extendMinutes, d.extendMinutes),
    extendPrice: clampPrice(raw.extendPrice, d.extendPrice),
    warnMinutes: clampInt(raw.warnMinutes, 0, LIMITS.warnMinutesMax, d.warnMinutes),
    voice: typeof raw.voice === 'boolean' ? raw.voice : d.voice,
    vibrate: typeof raw.vibrate === 'boolean' ? raw.vibrate : d.vibrate,
    volume: typeof raw.volume === 'number' && raw.volume >= 0.1 && raw.volume <= 1 ? raw.volume : d.volume,
  }
}
