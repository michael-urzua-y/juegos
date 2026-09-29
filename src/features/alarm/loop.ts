// Repite la alarma hasta que se confirmen todos los turnos terminados.

import type { Session } from '@/features/sessions'
import { ALARM } from '@/shared/config'
import { stopSpeaking, vibrate } from '@/shared/platform/sound'
import { ringOnce } from './announcer'
import { clearAlarmNotification, notifyEnded } from './notify'

let timer: ReturnType<typeof setInterval> | undefined
let ringing: readonly Session[] = []

const isHidden = () => document.visibilityState === 'hidden'

function ring(): void {
  ringOnce(() => ringing.map((s) => s.name))
  // Pantalla bloqueada o app en segundo plano: la notificación es lo único que vibra.
  if (isHidden()) void notifyEnded(ringing)
}

export function syncAlarmLoop(alarms: readonly Session[]): void {
  const added = alarms.some((a) => !ringing.some((r) => r.id === a.id))
  ringing = alarms

  if (!alarms.length) {
    clearInterval(timer)
    timer = undefined
    stopSpeaking()
    vibrate(0)
    void clearAlarmNotification()
    return
  }
  // Una alarma nueva reinicia el ciclo para avisar de inmediato.
  if (added || !timer) {
    clearInterval(timer)
    ring()
    timer = setInterval(ring, ALARM.repeatEveryMs)
  }
}

// Al volver a la app la alarma está en pantalla: la notificación ya no hace falta.
if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (!isHidden()) void clearAlarmNotification()
  })
}
