// Cómo suena cada aviso: pitidos, vibración y voz según los ajustes.

import { settings } from '@/features/settings'
import { ALARM } from '@/shared/config'
import { alarmBeeps, speak, vibrate, warnBeeps } from '@/shared/platform/sound'
import { endedMessage, SAMPLE_NAME, warningMessage } from './messages'

/** Una ronda de alarma de término. `getNames` se evalúa al hablar, por si alguien ya confirmó. */
export function ringOnce(getNames: () => readonly string[]): void {
  alarmBeeps(settings.volume)
  if (settings.vibrate) vibrate(ALARM.vibration)
  if (settings.voice) {
    setTimeout(() => {
      const names = getNames()
      if (names.length) speak(endedMessage(names))
    }, ALARM.voiceDelayMs)
  }
}

export function announceWarning(names: readonly string[]): void {
  warnBeeps(settings.volume)
  if (settings.vibrate) vibrate(ALARM.warnVibration)
  if (settings.voice) setTimeout(() => speak(warningMessage(names, settings.warnMinutes)), ALARM.warnVoiceDelayMs)
}

export const testAlarm = () => ringOnce(() => [SAMPLE_NAME])
