// Notificaciones del sistema. En el navegador son un respaldo: con la app en segundo plano,
// Chrome puede congelar la página y el aviso llegar tarde o no llegar.
// En la app Android las alarmas se programan en el sistema (ver features/alarm/scheduled.ts)
// y aquí solo se gestiona el permiso.

import { LocalNotifications } from '@capacitor/local-notifications'
import { isNative } from './native'

const webSupported = !isNative && typeof window !== 'undefined' && 'Notification' in window

export const notifications = $state({
  supported: isNative || webSupported,
  permission: (webSupported ? Notification.permission : 'default') as NotificationPermission,
})

type NativeState = Awaited<ReturnType<typeof LocalNotifications.checkPermissions>>['display']
const fromNative = (s: NativeState): NotificationPermission =>
  s === 'granted' ? 'granted' : s === 'denied' ? 'denied' : 'default'

async function refreshNative(): Promise<void> {
  try {
    notifications.permission = fromNative((await LocalNotifications.checkPermissions()).display)
  } catch {
    // Sin el plugin (no debería pasar en la app)
  }
}

/** Refleja cambios hechos desde los ajustes del celular o de Chrome al volver a la app. */
if (typeof document !== 'undefined' && notifications.supported) {
  if (isNative) void refreshNative()
  document.addEventListener('visibilitychange', () => {
    if (isNative) void refreshNative()
    else notifications.permission = Notification.permission
  })
}

export async function requestNotificationPermission(): Promise<void> {
  if (isNative) {
    try {
      notifications.permission = fromNative((await LocalNotifications.requestPermissions()).display)
    } catch {
      // El usuario cerró el diálogo
    }
    return
  }
  if (!webSupported || Notification.permission !== 'default') return
  notifications.permission = await Notification.requestPermission()
}

export async function showNotification(
  title: string,
  options: NotificationOptions & { vibrate?: readonly number[]; renotify?: boolean },
): Promise<void> {
  if (!webSupported || Notification.permission !== 'granted') return
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
  if (isNative) {
    // Las alarmas ya mostradas por el sistema se quitan al confirmar en la app
    await LocalNotifications.removeAllDeliveredNotifications().catch(() => {})
    return
  }
  if (!webSupported) return
  try {
    const reg = await navigator.serviceWorker?.getRegistration()
    for (const n of (await reg?.getNotifications({ tag })) ?? []) n.close()
  } catch {
    // Sin service worker no hay notificaciones que cerrar.
  }
}
