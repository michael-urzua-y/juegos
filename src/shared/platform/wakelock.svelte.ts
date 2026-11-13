// Mantiene la pantalla encendida mientras se necesite.
// El navegador suelta el bloqueo al pasar a segundo plano; se recupera al volver.
// En la app Android lo hace el sistema (KeepAwake) y no se suelta solo.

import { KeepAwake } from '@capacitor-community/keep-awake'
import { isNative } from './native'

export const wakeLock = $state({
  supported: isNative || (typeof navigator !== 'undefined' && 'wakeLock' in navigator),
  active: false,
})

let wanted = false
let sentinel: WakeLockSentinel | null = null

async function acquire(): Promise<void> {
  if (!wakeLock.supported || sentinel || document.visibilityState !== 'visible') return
  try {
    sentinel = await navigator.wakeLock.request('screen')
    wakeLock.active = true
    sentinel.addEventListener('release', () => {
      sentinel = null
      wakeLock.active = false
    })
  } catch {
    wakeLock.active = false
  }
}

export function setWakeLock(on: boolean): void {
  if (isNative) {
    if (on === wakeLock.active) return
    wakeLock.active = on
    void (on ? KeepAwake.keepAwake() : KeepAwake.allowSleep()).catch(() => {})
    return
  }
  wanted = on
  if (on) void acquire()
  else void sentinel?.release()
}

if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (wanted && document.visibilityState === 'visible') void acquire()
  })
}
