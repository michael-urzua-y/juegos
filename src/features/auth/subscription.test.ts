import { describe, expect, it } from 'vitest'
import { daysUntil, extendDate, subscriptionBadge, whatsappLink } from './subscription'

const TODAY = '2026-09-30'
const client = (paidUntil: string, status: 'active' | 'suspended' | 'expired' = 'active') =>
  ({ role: 'client', status, paidUntil }) as const

describe('daysUntil', () => {
  it('cuenta días calendario, incluso cruzando meses', () => {
    expect(daysUntil('2026-10-05', TODAY)).toBe(5)
    expect(daysUntil('2026-09-30', TODAY)).toBe(0)
    expect(daysUntil('2026-09-28', TODAY)).toBe(-2)
  })
})

describe('subscriptionBadge', () => {
  it('muestra el estado según el vencimiento', () => {
    expect(subscriptionBadge(client('2026-11-30'), TODAY)).toEqual({ label: 'Al día', tone: 'ok' })
    expect(subscriptionBadge(client('2026-10-03'), TODAY)).toEqual({ label: 'Vence en 3 días', tone: 'warn' })
    expect(subscriptionBadge(client('2026-10-01'), TODAY).label).toBe('Vence en 1 día')
    expect(subscriptionBadge(client(TODAY), TODAY).label).toBe('Vence hoy')
    expect(subscriptionBadge(client('2026-09-29'), TODAY).label).toBe('En gracia · venció hace 1 día')
    expect(subscriptionBadge(client('2026-09-01', 'expired'), TODAY)).toEqual({ label: 'Vencido', tone: 'danger' })
    expect(subscriptionBadge(client('2026-12-01', 'suspended'), TODAY).label).toBe('Suspendido')
    expect(subscriptionBadge({ role: 'admin', status: 'active', paidUntil: '' }, TODAY).label).toBe('Administrador')
  })
})

describe('whatsappLink', () => {
  it('arma el enlace solo con números válidos', () => {
    expect(whatsappLink('+56 9 1234 5678', 'Hola')).toBe('https://wa.me/56912345678?text=Hola')
    expect(whatsappLink('soporte@monay.cl')).toBeNull()
  })
})

describe('extendDate', () => {
  it('coincide con el cálculo del servidor', () => {
    expect(extendDate('2026-10-15', TODAY, 1)).toBe('2026-11-15')
    expect(extendDate('2026-08-01', TODAY, 1)).toBe('2026-10-30')
    expect(extendDate('', TODAY, 2)).toBe('2026-11-30')
    expect(extendDate('2027-01-31', TODAY, 1)).toBe('2027-03-03')
  })
})
