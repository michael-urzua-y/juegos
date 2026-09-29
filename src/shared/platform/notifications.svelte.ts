// Notificaciones del sistema. Son un respaldo: con la app en segundo plano,
// Chrome puede congelar la página y el aviso llegar tarde o no llegar.

const supported = typeof window !== 'undefined' && 'Notification' in window

export const notifications = $state({
  permission: (supported ? Notification.permission : 'denied') as NotificationPermission,
})

export async function requestNotificationPermission(): Promise<void> {
  if (!supported || Notification.permission !== 'default') return
  notifications.permission = await Notification.requestPermission()
}

export async function showNotification(
  title: string,
  options: NotificationOptions & { vibrate?: readonly number[]; renotify?: boolean },
): Promise<void> {
  if (!supported || Notification.permission !== 'granted') return
  try {
    const reg = await navigator.serviceWorker?.getRegistration()
    if (reg) await reg.showNotification(title, options)
    else new Notification(title, options)
  } catch {
    // Algunos navegadores no permiten notificar desde aquí.
  }
}
