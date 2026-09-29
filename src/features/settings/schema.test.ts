import { describe, expect, it } from 'vitest'
import { DEFAULT_SETTINGS, normalizeGames, normalizePlans, parseSettings } from './schema'

describe('parseSettings', () => {
  it('usa los valores por defecto si no hay datos válidos', () => {
    expect(parseSettings(undefined)).toEqual(DEFAULT_SETTINGS)
    expect(parseSettings('basura')).toEqual(DEFAULT_SETTINGS)
  })

  it('no comparte referencias con los valores por defecto', () => {
    const s = parseSettings(undefined)
    s.plans.push({ minutes: 99, price: 0 })
    expect(DEFAULT_SETTINGS.plans).toHaveLength(4)
  })

  it('corrige valores fuera de rango', () => {
    const s = parseSettings({ extendMinutes: -3, extendPrice: 1e12, warnMinutes: 99, volume: 7, voice: 'sí' })
    expect(s.extendMinutes).toBe(1)
    expect(s.extendPrice).toBe(1_000_000)
    expect(s.warnMinutes).toBe(10)
    expect(s.volume).toBe(DEFAULT_SETTINGS.volume)
    expect(s.voice).toBe(true)
  })

  it('respeta una lista de juegos vacía', () => {
    expect(parseSettings({ games: [] }).games).toEqual([])
  })
})

describe('normalizePlans', () => {
  it('filtra inválidos, quita duplicados y ordena', () => {
    const plans = normalizePlans([
      { minutes: 15, price: 2500 },
      { minutes: 5 },
      { minutes: 0 },
      { minutes: 15, price: 1 },
      null,
    ])
    expect(plans).toEqual([
      { minutes: 5, price: 0 },
      { minutes: 15, price: 2500 },
    ])
  })
})

describe('normalizeGames', () => {
  it('limpia textos y quita duplicados', () => {
    expect(normalizeGames(['  Castillo ', 'Castillo', '', 42, 'Tobo‮gán'])).toEqual(['Castillo', 'Tobogán'])
  })
})
