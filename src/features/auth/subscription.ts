// Cómo mostrar el estado de una suscripción. Funciones puras (las usa también el panel de clientes).

import { dayKeyToDate, DAY, toDayKey } from '@/shared/lib/time'
import type { UserView } from './types'

/** Días que faltan para `until` desde `today` (negativo si ya pasó). Fechas "AAAA-MM-DD". */
export function daysUntil(until: string, today: string): number {
  return Math.round((dayKeyToDate(until).getTime() - dayKeyToDate(today).getTime()) / DAY)
}

/** Desde cuántos días antes del vencimiento se avisa. */
export const EXPIRY_WARNING_DAYS = 5

export type BadgeTone = 'ok' | 'warn' | 'danger' | 'muted'

export interface SubscriptionBadge {
  label: string
  tone: BadgeTone
}

export function subscriptionBadge(
  user: Pick<UserView, 'role' | 'status' | 'paidUntil'>,
  today: string,
): SubscriptionBadge {
  if (user.role === 'admin') return { label: 'Administrador', tone: 'muted' }
  if (user.status === 'suspended') return { label: 'Suspendido', tone: 'danger' }
  if (user.status === 'expired') return { label: 'Vencido', tone: 'danger' }
  const days = daysUntil(user.paidUntil, today)
  if (days < 0) return { label: `En gracia · venció hace ${-days} ${-days === 1 ? 'día' : 'días'}`, tone: 'warn' }
  if (days === 0) return { label: 'Vence hoy', tone: 'warn' }
  if (days <= EXPIRY_WARNING_DAYS) return { label: `Vence en ${days} ${days === 1 ? 'día' : 'días'}`, tone: 'warn' }
  return { label: 'Al día', tone: 'ok' }
}

/** Enlace de WhatsApp si el contacto es un número; si no, null. */
export function whatsappLink(contact: string, text = ''): string | null {
  const digits = contact.replace(/\D/g, '')
  if (digits.length < 8) return null
  return `https://wa.me/${digits}${text ? `?text=${encodeURIComponent(text)}` : ''}`
}

/** Vencimiento tras pagar `months` meses (igual que el servidor): si ya venció, cuenta desde hoy. */
export function extendDate(paidUntil: string, today: string, months: number): string {
  const base = paidUntil && paidUntil >= today ? dayKeyToDate(paidUntil) : dayKeyToDate(today)
  // setMonth normaliza el desborde igual que AddDate de Go (31 de enero + 1 mes = 3 de marzo)
  base.setMonth(base.getMonth() + months)
  return toDayKey(base)
}
