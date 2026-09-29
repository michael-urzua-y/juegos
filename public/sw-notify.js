// Importado por el service worker generado (workbox.importScripts).
// Al tocar la notificación de alarma, enfoca la app abierta o la abre.
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      const client = clients.find((c) => 'focus' in c)
      return client ? client.focus() : self.clients.openWindow('/')
    }),
  )
})
