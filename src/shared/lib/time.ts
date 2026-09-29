export const SECOND = 1_000
export const MINUTE = 60 * SECOND
export const DAY = 24 * 60 * MINUTE

export const minutesToMs = (minutes: number) => minutes * MINUTE

export function startOfDay(ts: number): number {
  const d = new Date(ts)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}
