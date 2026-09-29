// Totales diarios. El detalle de cada turno se guarda LIMITS.historyDays días;
// después se archiva como un resumen por día, que ocupa muy poco y se conserva siempre.

import { sessions, type Session } from '@/features/sessions'
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

/** Turnos con detalle de un día, del más reciente al más antiguo. */
export const sessionsOfDay = (key: string) =>
  sessions.filter((s) => dayKey(s.startedAt) === key).sort((a, b) => b.startedAt - a.startedAt)

export const statsOfDay = (key: string): DayStats =>
  mergeStats(archive[key] ?? emptyDay(), summarize(sessionsOfDay(key)))

/** El día tiene totales archivados (su detalle ya no está disponible). */
export const isArchived = (key: string) => key in archive

/** Días con algún turno, para marcarlos en el calendario. */
export const daysWithData = (): Set<string> =>
  new Set([...Object.keys(archive), ...sessions.map((s) => dayKey(s.startedAt))])

export function clearArchive(): void {
  for (const key of Object.keys(archive)) delete archive[key]
}

/** Guarda el archivo en cada cambio. Llamar dentro de un $effect.root. */
export function persistArchive(): void {
  $effect(() => writeJSON(STORAGE_KEY, archive))
}
