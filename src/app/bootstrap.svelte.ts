// Punto de composición: conecta el reloj, los turnos, la caja, la alarma y las APIs del navegador.
// Los módulos no se conocen entre sí más de lo necesario; la orquestación vive aquí.

import { untrack } from 'svelte'
import { announceWarning, syncAlarmLoop, syncScheduledAlarms } from '@/features/alarm'
import { archiveSessions, persistArchive } from '@/features/reports'
import {
  advanceAll,
  alarmSessions,
  hasActiveSessions,
  persistSessions,
  sessions,
  spokenName,
  takeExpiredSessions,
} from '@/features/sessions'
import { persistSettings, settings } from '@/features/settings'
import { dataFingerprint, noteLocalChange } from '@/features/sync'
import { startClock } from '@/shared/lib/clock.svelte'
import { isNative } from '@/shared/platform/native'
import { setWakeLock } from '@/shared/platform/wakelock.svelte'
import { watchAccount } from './account.svelte'

export function bootstrap(): void {
  // El detalle antiguo pasa a totales diarios antes de guardar nada.
  archiveSessions(takeExpiredSessions(Date.now()))

  $effect.root(() => {
    persistSettings()
    persistSessions()
    persistArchive()
    // Cualquier cambio en turnos, caja o ajustes se sube al servidor (con espera y reintentos).
    $effect(() => {
      const fingerprint = dataFingerprint()
      untrack(() => noteLocalChange(fingerprint))
    })
    $effect(() => setWakeLock(hasActiveSessions()))
    $effect(() => {
      const alarms = alarmSessions()
      untrack(() => syncAlarmLoop(alarms))
    })
    // App Android: cada turno en juego deja su alarma agendada en el sistema.
    if (isNative) {
      let lastKey = ''
      $effect(() => {
        const pending = sessions.filter((s) => s.status === 'running' || s.status === 'alarm')
        const key = pending.map((s) => `${s.id}:${s.status}:${s.endsAt}`).join('|') + `|${settings.warnMinutes}`
        if (key === lastKey) return
        lastKey = key
        untrack(() => void syncScheduledAlarms($state.snapshot(pending), { warnMinutes: settings.warnMinutes }))
      })
    }
  })

  watchAccount()

  startClock((now) => {
    // Los turnos que terminan pasan a 'alarm' y el ciclo de alarma se encarga del aviso.
    const { warned } = advanceAll(now)
    if (warned.length) announceWarning(warned.map(spokenName))
  })
}
