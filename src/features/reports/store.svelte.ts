// Totales diarios. El detalle de cada turno se guarda LIMITS.historyDays días;
// después se archiva como un resumen por día, que ocupa muy poco y se conserva siempre.

import { isActive, sessions, type Session } from '@/features/sessions'
import { readJSON, writeJSON } from '@/shared/lib/storage'
import { dayKey } from '@/shared/lib/time'
import { emptyDay, groupByDay, mergeStats, parseArchive, summarize, type DayStats } from './stats'

const STORAGE_KEY = 'archive'

const archive: Record<string, DayStats> = $state(parseArchive(readJSON(STORAGE_KEY)))

export function archiveSessions(list: readonly Session[]): void {
  for (const [key, day] of groupByDay(list)) {
    archive[key] = mergeStats(archive[key] ?? emptyDay(), summarize(day))
  }
}

/** Solo los turnos terminados cuentan en la caja; los que siguen jugando aún pueden cambiar (+5 min). */
const finished = () => sessions.filter((s) => s.status === 'done')

/** Turnos terminados de un día, del más reciente al más antiguo. */
export const sessionsOfDay = (key: string) =>
  finished()
    .filter((s) => dayKey(s.startedAt) === key)
    .sort((a, b) => b.startedAt - a.startedAt)

export const statsOfDay = (key: string): DayStats =>
  mergeStats(archive[key] ?? emptyDay(), summarize(sessionsOfDay(key)))

/** El día tiene totales archivados (su detalle ya no está disponible). */
export const isArchived = (key: string) => key in archive

/** Días con algún turno terminado, para marcarlos en el calendario. */
export const daysWithData = (): Set<string> =>
  new Set([...Object.keys(archive), ...finished().map((s) => dayKey(s.startedAt))])

/** Niños jugando ahora y lo que sumarán a la caja cuando terminen. */
export function inPlay(): { count: number; amount: number } {
  const active = sessions.filter(isActive)
  return { count: active.length, amount: active.reduce((sum, s) => sum + s.price, 0) }
}

/** Copia simple del archivo de totales, para sincronizar. */
export const exportArchive = (): Record<string, DayStats> => $state.snapshot(archive)

/** Reemplaza el archivo de totales con datos externos, validados. */
export function importArchive(raw: unknown): void {
  for (const key of Object.keys(archive)) delete archive[key]
  Object.assign(archive, parseArchive(raw))
}

export const clearArchive = () => importArchive(null)

/** Guarda el archivo en cada cambio. Llamar dentro de un $effect.root. */
export function persistArchive(): void {
  $effect(() => writeJSON(STORAGE_KEY, archive))
}
