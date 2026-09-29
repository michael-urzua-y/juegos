// Punto de composición: conecta el reloj, los turnos, la caja, la alarma y las APIs del navegador.
// Los módulos no se conocen entre sí más de lo necesario; la orquestación vive aquí.

import { untrack } from 'svelte'
import { announceWarning, syncAlarmLoop } from '@/features/alarm'
import { archiveSessions, persistArchive } from '@/features/reports'
import {
  advanceAll,
  alarmSessions,
  hasActiveSessions,
  persistSessions,
  spokenName,
  takeExpiredSessions,
} from '@/features/sessions'
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
    // Los turnos que terminan pasan a 'alarm' y el ciclo de alarma se encarga del aviso.
    const { warned } = advanceAll(now)
    if (warned.length) announceWarning(warned.map(spokenName))
  })
}
