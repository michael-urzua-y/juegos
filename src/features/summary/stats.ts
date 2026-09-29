import type { Session } from '@/features/sessions'
import { DAY, startOfDay } from '@/shared/lib/time'

export type RangeId = 'today' | 'yesterday' | 'week'

export const RANGES: readonly { id: RangeId; label: string }[] = [
  { id: 'today', label: 'Hoy' },
  { id: 'yesterday', label: 'Ayer' },
  { id: 'week', label: '7 días' },
]

export const NO_GAME = 'Sin juego'

/** [desde, hasta) en milisegundos. */
export function rangeBounds(range: RangeId, now: number): [number, number] {
  const today = startOfDay(now)
  switch (range) {
    case 'today':
      return [today, Infinity]
    case 'yesterday':
      return [today - DAY, today]
    case 'week':
      return [today - 6 * DAY, Infinity]
  }
}

export interface GameStats {
  game: string
  count: number
  amount: number
}

export interface Summary {
  sessions: Session[]
  total: number
  minutes: number
  byGame: GameStats[]
}

export function summarize(all: readonly Session[], [from, to]: [number, number]): Summary {
  const sessions = all.filter((s) => s.startedAt >= from && s.startedAt < to).sort((a, b) => b.startedAt - a.startedAt)

  const games = new Map<string, GameStats>()
  let total = 0
  let minutes = 0
  for (const s of sessions) {
    total += s.price
    minutes += s.minutes
    const game = s.game || NO_GAME
    const g = games.get(game) ?? { game, count: 0, amount: 0 }
    g.count++
    g.amount += s.price
    games.set(game, g)
  }

  const byGame = [...games.values()].sort((a, b) => b.amount - a.amount || b.count - a.count)
  return { sessions, total, minutes, byGame }
}
