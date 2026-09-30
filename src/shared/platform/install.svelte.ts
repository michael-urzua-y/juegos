// Captura el aviso "Instalar app" de Chrome para mostrar un botón propio, solo en celulares:
// la app está pensada para el teléfono; en el computador se usa desde el navegador.

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

let deferred: BeforeInstallPromptEvent | null = null

interface NavigatorUAData {
  mobile: boolean
}

export function isMobileDevice(): boolean {
  if (typeof navigator === 'undefined') return false
  const uaData = (navigator as Navigator & { userAgentData?: NavigatorUAData }).userAgentData
  return uaData?.mobile ?? /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent)
}

export const installPrompt = $state({ available: false })

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    if (!isMobileDevice()) return // en el computador se deja el comportamiento normal del navegador
    e.preventDefault()
    deferred = e as BeforeInstallPromptEvent
    installPrompt.available = true
  })
  window.addEventListener('appinstalled', () => {
    deferred = null
    installPrompt.available = false
  })
}

export async function promptInstall(): Promise<void> {
  if (!deferred) return
  await deferred.prompt()
  await deferred.userChoice
  deferred = null
  installPrompt.available = false
}
