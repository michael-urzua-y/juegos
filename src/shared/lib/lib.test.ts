import { describe, expect, it } from 'vitest'
import { formatDuration, joinNames } from './format'
import { clampInt, cleanText } from './sanitize'

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
