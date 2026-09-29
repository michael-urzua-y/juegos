// Punto de composición: conecta el reloj, los turnos, la caja, la alarma y las APIs del navegador.
// Los módulos no se conocen entre sí más de lo necesario; la orquestación vive aquí.

import { untrack } from 'svelte'
import { announceWarning, notifyEnded, syncAlarmLoop } from '@/features/alarm'
import { archiveSessions, persistArchive } from '@/features/reports'
import { advanceAll, alarmSessions, hasActiveSessions, persistSessions, takeExpiredSessions } from '@/features/sessions'
import { persistSettings } from '@/features/settings'
import { startClock } from '@/shared/lib/clock.svelte'
import { setWakeLock } from '@/shared/platform/wakelock.svelte'

export function bootstrap(): void {
  // El detalle antiguo pasa a totales diarios antes de guardar nada.
  archiveSessions(takeExpiredSessions(Date.now()))

  $effect.root(() => {
    persistSettings()
    persistSessions()
    persistArchive()
    $effect(() => setWakeLock(hasActiveSessions()))
    $effect(() => {
      const alarms = alarmSessions()
      untrack(() => syncAlarmLoop(alarms))
    })
  })

  startClock((now) => {
    const { ended, warned } = advanceAll(now)
    if (warned.length) announceWarning(warned.map((s) => s.name))
    if (ended.length && document.visibilityState === 'hidden') void notifyEnded(ended)
  })
}
