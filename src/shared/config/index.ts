// Constantes de la app en un solo lugar. Cambiar un límite aquí lo aplica en toda la app.

export const STORAGE_PREFIX = 'turnos:v1:'

export const LIMITS = {
  nameMaxLength: 40,
  gameMaxLength: 30,
  maxGames: 20,
  maxPlans: 8,
  minutesMin: 1,
  minutesMax: 240,
  priceMax: 1_000_000,
  warnMinutesMax: 10,
  /** Días que se conserva el historial en el celular. */
  historyDays: 60,
  /** Tope de turnos guardados, para no llenar el almacenamiento. */
  maxStoredSessions: 5_000,
} as const

export const CLOCK_TICK_MS = 250

export const ALARM = {
  /** Cada cuánto se repite la alarma hasta que se confirme. */
  repeatEveryMs: 6_000,
  /** Espera antes de hablar, para que no se pise con los pitidos. */
  voiceDelayMs: 1_600,
  warnVoiceDelayMs: 600,
  vibration: [500, 150, 500, 150, 500],
  warnVibration: 200,
} as const
