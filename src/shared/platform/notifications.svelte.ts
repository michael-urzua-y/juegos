// Notificaciones del sistema. Son un respaldo: con la app en segundo plano,
// Chrome puede congelar la página y el aviso llegar tarde o no llegar.

const supported = typeof window !== 'undefined' && 'Notification' in window

export const notifications = $state({
  supported,
  permission: (supported ? Notification.permission : 'denied') as NotificationPermission,
})

/** Refleja cambios hechos desde los ajustes de Chrome al volver a la app. */
if (supported) {
  document.addEventListener('visibilitychange', () => {
    notifications.permission = Notification.permission
  })
}

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

/** Cierra las notificaciones con esa etiqueta (p. ej. al confirmar la alarma). */
export async function closeNotifications(tag: string): Promise<void> {
  if (!supported) return
  try {
    const reg = await navigator.serviceWorker?.getRegistration()
    for (const n of (await reg?.getNotifications({ tag })) ?? []) n.close()
  } catch {
    // Sin service worker no hay notificaciones que cerrar.
  }
}
