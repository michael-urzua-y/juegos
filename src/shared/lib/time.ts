export const SECOND = 1_000
export const MINUTE = 60 * SECOND
export const DAY = 24 * 60 * MINUTE

export const minutesToMs = (minutes: number) => minutes * MINUTE

export function startOfDay(ts: number): number {
  const d = new Date(ts)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

// ---------- Días como texto "AAAA-MM-DD" (hora local) ----------

const pad = (n: number) => String(n).padStart(2, '0')

export const toDayKey = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

export const dayKey = (ts: number) => toDayKey(new Date(ts))

export const isDayKey = (v: unknown): v is string => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v)

export function dayKeyToDate(key: string): Date {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d)
}

// ---------- Calendario ----------

export interface MonthRef {
  year: number
  /** 0 = enero */
  month: number
}

export const monthOf = (key: string): MonthRef => {
  const d = dayKeyToDate(key)
  return { year: d.getFullYear(), month: d.getMonth() }
}

export function addMonths({ year, month }: MonthRef, delta: number): MonthRef {
  const d = new Date(year, month + delta, 1)
  return { year: d.getFullYear(), month: d.getMonth() }
}

export const compareMonths = (a: MonthRef, b: MonthRef) => a.year - b.year || a.month - b.month

/** Celdas del mes empezando el lunes. `null` = casilla vacía antes del día 1. */
export function monthGrid({ year, month }: MonthRef): (string | null)[] {
  const offset = (new Date(year, month, 1).getDay() + 6) % 7
  const days = new Date(year, month + 1, 0).getDate()
  const cells: (string | null)[] = Array.from({ length: offset }, () => null)
  for (let d = 1; d <= days; d++) cells.push(toDayKey(new Date(year, month, d)))
  return cells
}
