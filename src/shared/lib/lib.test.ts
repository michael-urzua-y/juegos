import { describe, expect, it } from 'vitest'
import { formatDuration, joinNames } from './format'
import { clampInt, cleanText, foldText } from './sanitize'
import { addMonths, compareMonths, dayKey, dayKeyToDate, isDayKey, monthGrid } from './time'

describe('formatDuration', () => {
  it('muestra minutos y segundos, redondeando hacia arriba', () => {
    expect(formatDuration(125_000)).toBe('2:05')
    expect(formatDuration(100)).toBe('0:01')
    expect(formatDuration(0)).toBe('0:00')
    expect(formatDuration(-5_000)).toBe('0:00')
  })
})

describe('joinNames', () => {
  it('une nombres en español', () => {
    expect(joinNames([])).toBe('')
    expect(joinNames(['Mateo'])).toBe('Mateo')
    expect(joinNames(['Mateo', 'Sofía'])).toBe('Mateo y Sofía')
    expect(joinNames(['Mateo', 'Sofía', 'Leo'])).toBe('Mateo, Sofía y Leo')
  })
})

describe('cleanText', () => {
  it('quita caracteres de control y bidi, espacios extra, y limita el largo', () => {
    expect(cleanText(' a\u0007b‮  c ', 10)).toBe('ab c')
    expect(cleanText('abcdef', 3)).toBe('abc')
    expect(cleanText(42, 10)).toBe('')
  })
})

describe('clampInt', () => {
  it('convierte, redondea y limita', () => {
    expect(clampInt('12', 0, 10, 5)).toBe(10)
    expect(clampInt(3.6, 0, 10, 5)).toBe(4)
    expect(clampInt('', 0, 10, 5)).toBe(5)
    expect(clampInt(NaN, 0, 10, 5)).toBe(5)
    expect(clampInt(null, 0, 10, 5)).toBe(5)
  })
})

describe('calendario', () => {
  it('arma el mes empezando el lunes', () => {
    // 1 de septiembre de 2026 es martes → una casilla vacía
    const cells = monthGrid({ year: 2026, month: 8 })
    expect(cells[0]).toBeNull()
    expect(cells[1]).toBe('2026-09-01')
    expect(cells.at(-1)).toBe('2026-09-30')
    expect(cells).toHaveLength(31)
  })

  it('suma meses cruzando el año y compara', () => {
    expect(addMonths({ year: 2026, month: 11 }, 1)).toEqual({ year: 2027, month: 0 })
    expect(addMonths({ year: 2026, month: 0 }, -1)).toEqual({ year: 2025, month: 11 })
    expect(compareMonths({ year: 2026, month: 8 }, { year: 2026, month: 9 })).toBeLessThan(0)
  })

  it('convierte fechas a clave de día local', () => {
    expect(dayKey(new Date('2026-09-29T23:59:00').getTime())).toBe('2026-09-29')
    expect(dayKeyToDate('2026-02-03').getDate()).toBe(3)
    expect(isDayKey('2026-02-03')).toBe(true)
    expect(isDayKey('__proto__')).toBe(false)
  })
})

describe('foldText', () => {
  it('ignora mayúsculas y tildes', () => {
    expect(foldText('Sofía')).toBe(foldText('sofia'))
  })
})
