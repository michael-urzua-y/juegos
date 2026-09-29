const money = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 })
const clockTime = new Intl.DateTimeFormat('es-CL', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })

const monthYear = new Intl.DateTimeFormat('es-CL', { month: 'long', year: 'numeric' })
const longDate = new Intl.DateTimeFormat('es-CL', { weekday: 'long', day: 'numeric', month: 'long' })

export const formatMoney = (n: number) => money.format(n)
export const formatClock = (ts: number) => clockTime.format(ts)

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

/** "Septiembre de 2026" */
export const formatMonth = (year: number, month: number) => capitalize(monthYear.format(new Date(year, month, 1)))

/** "Martes, 29 de septiembre" */
export const formatLongDate = (d: Date) => capitalize(longDate.format(d))

/** "1 niño", "3 niños" */
export const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`

/** 125000 → "2:05". Redondea hacia arriba para no mostrar 0:00 antes de tiempo. */
export function formatDuration(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000))
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

/** "Mateo", "Mateo y Sofía", "Mateo, Sofía y Leo" */
export function joinNames(names: readonly string[]): string {
  if (names.length <= 1) return names[0] ?? ''
  return `${names.slice(0, -1).join(', ')} y ${names.at(-1)}`
}
