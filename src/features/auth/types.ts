export type Role = 'admin' | 'client'
export type SubscriptionStatus = 'active' | 'suspended' | 'expired'

/** Usuario tal como lo entrega la API. */
export interface UserView {
  id: number
  username: string
  displayName: string
  role: Role
  status: SubscriptionStatus
  mustChangePassword: boolean
  suspended: boolean
  /** Vencimiento "AAAA-MM-DD"; vacío para administradores. */
  paidUntil: string
  createdAt: number
  lastSeenAt: number
  /** Dispositivo con sesión abierta (solo en el panel de clientes). */
  device?: { name: string; lastSeenAt: number }
}

export interface Me {
  user: UserView
  /** Contacto para renovar o pedir ayuda (p. ej. WhatsApp). */
  supportContact: string
  graceDays: number
}
