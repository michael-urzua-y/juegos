import type { Session } from '@/features/sessions'
import { ALARM } from '@/shared/config'
import { joinNames } from '@/shared/lib/format'
import { closeNotifications, showNotification } from '@/shared/platform/notifications.svelte'

const TAG = 'alarma'

/**
 * Con la pantalla bloqueada Chrome no deja vibrar a la página, pero sí a una notificación.
 * `renotify` hace que cada repetición vuelva a vibrar y sonar aunque reemplace a la anterior.
 */
export function notifyEnded(ended: readonly Session[]): Promise<void> {
  return showNotification('⏰ Se acabó el tiempo', {
    body: joinNames(ended.map((s) => (s.game ? `${s.name} (${s.game})` : s.name))),
    tag: TAG,
    renotify: true,
    requireInteraction: true,
    icon: '/pwa-192x192.png',
    badge: '/pwa-64x64.png',
    vibrate: ALARM.vibration,
  })
}

export const clearAlarmNotification = () => closeNotifications(TAG)
