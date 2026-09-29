import type { Session } from '@/features/sessions'
import { ALARM } from '@/shared/config'
import { joinNames } from '@/shared/lib/format'
import { showNotification } from '@/shared/platform/notifications.svelte'

/** Respaldo cuando la app está en segundo plano. */
export function notifyEnded(ended: readonly Session[]): Promise<void> {
  return showNotification('⏰ Se acabó el tiempo', {
    body: joinNames(ended.map((s) => (s.game ? `${s.name} (${s.game})` : s.name))),
    tag: 'alarma',
    renotify: true,
    requireInteraction: true,
    icon: '/pwa-192x192.png',
    vibrate: ALARM.vibration,
  })
}
