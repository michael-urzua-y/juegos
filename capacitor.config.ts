import type { CapacitorConfig } from '@capacitor/cli'

// App Android: el mismo código web empaquetado con Capacitor (npm run android:build).
const config: CapacitorConfig = {
  // Identificador permanente en Play Store: no se puede cambiar después de publicar
  appId: 'cl.monaysolutions.turnos',
  appName: 'Turnos Inflables',
  webDir: 'dist',
  plugins: {
    // Las llamadas a la API salen por la red nativa: sin CORS y con la cookie de sesión
    // guardada por Android, igual que en el navegador.
    CapacitorHttp: { enabled: true },
    CapacitorCookies: { enabled: true },
    LocalNotifications: { smallIcon: 'ic_stat_alarm', iconColor: '#f97316' },
  },
}

export default config
