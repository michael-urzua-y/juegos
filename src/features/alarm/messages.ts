// Textos que se dicen en voz alta o se muestran en notificaciones.

import { joinNames } from '@/shared/lib/format'

export const endedMessage = (names: readonly string[]) => `Se acabó el tiempo de ${joinNames(names)}`

export function warningMessage(names: readonly string[], minutes: number): string {
  const time = minutes === 1 ? 'Queda un minuto' : `Quedan ${minutes} minutos`
  return `${time} para ${joinNames(names)}`
}

export const SAMPLE_NAME = 'Mateo'
