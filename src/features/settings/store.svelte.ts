import { LIMITS } from '@/shared/config'
import { cleanText } from '@/shared/lib/sanitize'
import { readJSON, writeJSON } from '@/shared/lib/storage'
import { MINUTE } from '@/shared/lib/time'
import { normalizePlans, parseSettings, type Plan, type Settings } from './schema'

const STORAGE_KEY = 'settings'

export const settings: Settings = $state(parseSettings(readJSON(STORAGE_KEY)))

export const warnThresholdMs = () => settings.warnMinutes * MINUTE

/** Planes listos para usar (válidos, únicos y ordenados). */
export const activePlans = (): Plan[] => normalizePlans(settings.plans)

/** Guarda los ajustes en cada cambio. Llamar dentro de un $effect.root. */
export function persistSettings(): void {
  $effect(() => writeJSON(STORAGE_KEY, settings))
}

/** Copia simple de los ajustes, para sincronizar. */
export const exportSettings = (): Settings => $state.snapshot(settings)

/** Reemplaza los ajustes con datos externos, validados. Sin datos válidos, vuelven a los de fábrica. */
export function importSettings(raw: unknown): void {
  Object.assign(settings, parseSettings(raw))
}

export const resetSettings = () => importSettings(null)

export function addGame(name: string): boolean {
  const game = cleanText(name, LIMITS.gameMaxLength)
  if (!game || settings.games.includes(game) || settings.games.length >= LIMITS.maxGames) return false
  settings.games.push(game)
  return true
}

export function removeGame(index: number): void {
  settings.games.splice(index, 1)
}

export function addPlan(): void {
  if (settings.plans.length >= LIMITS.maxPlans) return
  const last = settings.plans.at(-1)
  const minutes = Math.min(LIMITS.minutesMax, (last?.minutes ?? 0) + 5)
  settings.plans.push({ minutes, price: last?.price ?? 0 })
}

export function removePlan(index: number): void {
  if (settings.plans.length > 1) settings.plans.splice(index, 1)
}
