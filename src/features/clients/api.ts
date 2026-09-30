import type { UserView } from '@/features/auth'
import { api } from '@/shared/lib/api'

export interface ClientList {
  users: UserView[]
  /** Fecha de hoy según el servidor ("AAAA-MM-DD"). */
  today: string
  graceDays: number
}

interface ClientResult {
  user: UserView
  tempPassword?: string
}

const path = (id: number, action: string) => `/admin/users/${id}/${action}`

export const listClients = () => api<ClientList>('GET', '/admin/users')

export const createClient = (username: string, displayName: string) =>
  api<Required<ClientResult>>('POST', '/admin/users', { username, displayName })

export const resetPassword = (id: number) => api<Required<ClientResult>>('POST', path(id, 'reset-password'))

export const setSuspended = (id: number, suspended: boolean) =>
  api<ClientResult>('POST', path(id, 'suspend'), { suspended })

export const registerPayment = (id: number, months: number) =>
  api<ClientResult>('POST', path(id, 'payment'), { months })

export const releaseDevice = (id: number) => api<ClientResult>('POST', path(id, 'release'))
