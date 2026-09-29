// Captura el aviso "Instalar app" de Chrome para mostrar un botón propio.

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

let deferred: BeforeInstallPromptEvent | null = null

export const installPrompt = $state({ available: false })

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
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
