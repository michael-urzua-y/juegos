// Alarmas programadas en el sistema (solo app Android).
// Cada turno en juego deja su aviso agendado en Android a la hora de término: suena y vibra aunque
// el celular esté bloqueado o la app cerrada. Si nadie confirma, se repite cada minuto unos minutos.
// Con la app abierta, la alarma en pantalla (loop.ts) sigue funcionando igual que en la web.

import { LocalNotifications, type LocalNotificationSchema } from '@capacitor/local-notifications'
import { displayName, type Session } from '@/features/sessions'
import { endedMessage, warningMessage } from './messages'

const CHANNEL_END = 'alarma-termino'
const CHANNEL_WARN = 'aviso-previo'
/** Repeticiones de la alarma de término si nadie la confirma (una por minuto). */
const REPEATS = 5
const REPEAT_EVERY_MS = 60_000
/** Cada turno usa un bloque de ids: 0..REPEATS para el término y 7 para el aviso previo. */
const IDS_PER_SESSION = 8

let ready: Promise<void> | undefined

function setup(): Promise<void> {
  ready ??= Promise.all([
    LocalNotifications.createChannel({
      id: CHANNEL_END,
      name: 'Alarma de término',
      description: 'Avisa cuando se acaba el tiempo de un niño',
      importance: 5,
      visibility: 1,
      vibration: true,
      lights: true,
      lightColor: '#f97316',
    }),
    LocalNotifications.createChannel({
      id: CHANNEL_WARN,
      name: 'Aviso previo',
      description: 'Avisa cuando queda poco tiempo',
      importance: 4,
      visibility: 1,
      vibration: true,
    }),
  ])
    .then(() => {})
    .catch(() => {})
  return ready
}

/** Id numérico estable a partir del id del turno (Android exige enteros de 32 bits). */
function baseId(sessionId: string): number {
  let h = 0
  for (let i = 0; i < sessionId.length; i++) h = (Math.imul(h, 31) + sessionId.charCodeAt(i)) | 0
  return (Math.abs(h) % 200_000_000) * IDS_PER_SESSION
}

const label = (s: Session) => (s.game ? `${displayName(s)} · ${s.game}` : displayName(s))

export interface ScheduleOptions {
  warnMinutes: number
}

/**
 * Deja agendados exactamente los avisos de los turnos en juego.
 * Se llama cada vez que cambia un turno (inicio, pausa, +5 min, terminar) o el aviso previo.
 */
export async function syncScheduledAlarms(running: readonly Session[], opts: ScheduleOptions): Promise<void> {
  await setup()
  const now = Date.now()
  const wanted: LocalNotificationSchema[] = []

  for (const s of running) {
    const id = baseId(s.id)
    for (let k = 0; k <= REPEATS; k++) {
      const at = s.endsAt + k * REPEAT_EVERY_MS
      if (at <= now) continue
      wanted.push({
        id: id + k,
        title: '⏰ Se acabó el tiempo',
        body: k === 0 ? label(s) : `${label(s)} · sin confirmar`,
        largeBody: endedMessage([displayName(s)]),
        channelId: CHANNEL_END,
        schedule: { at: new Date(at), allowWhileIdle: true },
        autoCancel: true,
      })
    }
    const warnAt = s.endsAt - opts.warnMinutes * 60_000
    if (opts.warnMinutes > 0 && warnAt > now) {
      wanted.push({
        id: id + IDS_PER_SESSION - 1,
        title: '⏳ Queda poco',
        body: warningMessage([displayName(s)], opts.warnMinutes),
        channelId: CHANNEL_WARN,
        schedule: { at: new Date(warnAt), allowWhileIdle: true },
        autoCancel: true,
      })
    }
  }

  try {
    const { notifications: pending } = await LocalNotifications.getPending()
    if (pending.length) await LocalNotifications.cancel({ notifications: pending.map((n) => ({ id: n.id })) })
    if (wanted.length) await LocalNotifications.schedule({ notifications: wanted })
  } catch {
    // Sin permiso de notificaciones: la alarma en pantalla sigue funcionando con la app abierta
  }
}
