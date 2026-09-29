import { describe, expect, it } from 'vitest'
import type { Session } from '@/features/sessions'
import { DAY } from '@/shared/lib/time'
import { groupByDay, mergeStats, NO_GAME, parseArchive, summarize } from './stats'

const NOW = new Date('2026-09-29T18:00:00').getTime()

const s = (id: string, startedAt: number, game: string, price: number, name = id, minutes = 10): Session => ({
  id,
  name,
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

const today = [
  s('a', NOW - 60_000, 'Castillo', 2000, 'Mateo'),
  s('b', NOW - 120_000, '', 1000, 'Sofía', 5),
  s('c', NOW - 180_000, 'Castillo', 2500, 'mateo', 15),
]

describe('summarize', () => {
  it('suma lo recaudado, turnos, minutos y niños distintos', () => {
    const r = summarize(today)
    expect(r.total).toBe(5500)
    expect(r.sessions).toBe(3)
    expect(r.minutes).toBe(30)
    expect(r.kids).toBe(2) // "Mateo" y "mateo" son el mismo niño
  })

  it('agrupa por juego ordenado por monto', () => {
    expect(summarize(today).byGame).toEqual([
      { game: 'Castillo', count: 2, amount: 4500 },
      { game: NO_GAME, count: 1, amount: 1000 },
    ])
  })

  it('devuelve ceros sin turnos', () => {
    expect(summarize([])).toEqual({ total: 0, sessions: 0, kids: 0, minutes: 0, byGame: [] })
  })
})

describe('mergeStats', () => {
  it('suma totales y combina juegos', () => {
    const merged = mergeStats(
      summarize(today),
      summarize([s('d', NOW, 'Castillo', 1000), s('e', NOW, 'Tobogán', 9000)]),
    )
    expect(merged.total).toBe(15500)
    expect(merged.sessions).toBe(5)
    expect(merged.byGame[0]).toEqual({ game: 'Tobogán', count: 1, amount: 9000 })
    expect(merged.byGame[1]).toEqual({ game: 'Castillo', count: 3, amount: 5500 })
  })
})

describe('groupByDay', () => {
  it('separa por día local', () => {
    const days = groupByDay([...today, s('ayer', NOW - DAY, 'Tobogán', 3000)])
    expect([...days.keys()]).toEqual(['2026-09-29', '2026-09-28'])
    expect(days.get('2026-09-29')).toHaveLength(3)
  })
})

describe('parseArchive', () => {
  it('descarta claves y valores inválidos', () => {
    const archive = parseArchive({
      '2026-01-05': {
        total: 5000,
        sessions: 3,
        kids: 2,
        minutes: 30,
        byGame: [{ game: 'Castillo', count: 3, amount: 5000 }, { game: '' }],
      },
      '2026-01-06': { total: -10, sessions: 'x' },
      'no-es-fecha': { total: 1 },
      __proto__: { total: 1 },
    })
    expect(Object.keys(archive)).toEqual(['2026-01-05', '2026-01-06'])
    expect(archive['2026-01-05'].byGame).toHaveLength(1)
    expect(archive['2026-01-06']).toEqual({ total: 0, sessions: 0, kids: 0, minutes: 0, byGame: [] })
  })

  it('devuelve vacío si no es un objeto', () => {
    expect(parseArchive(null)).toEqual({})
    expect(parseArchive([1, 2])).toEqual({})
  })
})
