// Mantiene la pantalla encendida mientras se necesite.
// El navegador suelta el bloqueo al pasar a segundo plano; se recupera al volver.

export const wakeLock = $state({
  supported: typeof navigator !== 'undefined' && 'wakeLock' in navigator,
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
  wanted = on
  if (on) void acquire()
  else void sentinel?.release()
}

if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (wanted && document.visibilityState === 'visible') void acquire()
  })
}
