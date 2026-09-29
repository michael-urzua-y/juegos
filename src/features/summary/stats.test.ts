import { describe, expect, it } from 'vitest'
import type { Session } from '@/features/sessions'
import { DAY } from '@/shared/lib/time'
import { NO_GAME, rangeBounds, summarize } from './stats'

const NOW = new Date('2026-09-29T18:00:00').getTime()

const s = (id: string, startedAt: number, game: string, price: number, minutes = 10): Session => ({
  id,
  name: id,
  game,
  minutes,
  price,
  startedAt,
  endsAt: startedAt + minutes * 60_000,
  pausedRemainingMs: 0,
  warned: false,
  status: 'done',
  finishedAt: null,
})

const data = [
  s('hoy1', NOW - 60_000, 'Castillo', 2000),
  s('hoy2', NOW - 120_000, '', 1000, 5),
  s('hoy3', NOW - 180_000, 'Castillo', 2500, 15),
  s('ayer', NOW - DAY, 'Tobogán', 3000),
  s('viejo', NOW - 10 * DAY, 'Tobogán', 9999),
]

describe('summarize', () => {
  it('suma lo recaudado y los minutos del día', () => {
    const r = summarize(data, rangeBounds('today', NOW))
    expect(r.total).toBe(5500)
    expect(r.minutes).toBe(30)
    expect(r.sessions.map((x) => x.id)).toEqual(['hoy1', 'hoy2', 'hoy3'])
  })

  it('agrupa por juego ordenado por monto', () => {
    const r = summarize(data, rangeBounds('today', NOW))
    expect(r.byGame).toEqual([
      { game: 'Castillo', count: 2, amount: 4500 },
      { game: NO_GAME, count: 1, amount: 1000 },
    ])
  })

  it('filtra ayer y últimos 7 días', () => {
    expect(summarize(data, rangeBounds('yesterday', NOW)).total).toBe(3000)
    expect(summarize(data, rangeBounds('week', NOW)).sessions).toHaveLength(4)
  })
})
