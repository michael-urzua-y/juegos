// Repite la alarma hasta que se confirmen todos los turnos terminados.

import type { Session } from '@/features/sessions'
import { ALARM } from '@/shared/config'
import { stopSpeaking, vibrate } from '@/shared/platform/sound'
import { ringOnce } from './announcer'

let timer: ReturnType<typeof setInterval> | undefined
let ringing: readonly Session[] = []

const ring = () => ringOnce(() => ringing.map((s) => s.name))

export function syncAlarmLoop(alarms: readonly Session[]): void {
  const added = alarms.some((a) => !ringing.some((r) => r.id === a.id))
  ringing = alarms

  if (!alarms.length) {
    clearInterval(timer)
    timer = undefined
    stopSpeaking()
    vibrate(0)
    return
  }
  // Una alarma nueva reinicia el ciclo para avisar de inmediato.
  if (added || !timer) {
    clearInterval(timer)
    ring()
    timer = setInterval(ring, ALARM.repeatEveryMs)
  }
}
