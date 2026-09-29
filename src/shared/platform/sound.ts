// Pitidos generados con Web Audio (sin archivos), voz con SpeechSynthesis y vibración.
// Todo funciona sin conexión.

let ctx: AudioContext | null = null

/**
 * Los navegadores bloquean el audio hasta que el usuario toca la pantalla.
 * Se llama en cada toque para dejar el contexto de audio desbloqueado.
 */
export function unlockAudio(): void {
  try {
    ctx ??= new AudioContext()
    if (ctx.state === 'suspended') void ctx.resume()
  } catch {
    // Navegador sin Web Audio.
  }
}

function tone(freq: number, startIn: number, duration: number, volume: number): void {
  if (!ctx) return
  const t = ctx.currentTime + startIn
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.type = 'square'
  osc.frequency.setValueAtTime(freq, t)
  gain.gain.setValueAtTime(0.0001, t)
  gain.gain.exponentialRampToValueAtTime(Math.max(0.0001, volume * 0.35), t + 0.02)
  gain.gain.exponentialRampToValueAtTime(0.0001, t + duration)
  osc.connect(gain).connect(ctx.destination)
  osc.start(t)
  osc.stop(t + duration + 0.05)
}

/** Alarma de término: tres pares de tonos agudos. Dura ~1,5 s. */
export function alarmBeeps(volume: number): void {
  unlockAudio()
  for (let i = 0; i < 3; i++) {
    tone(1319, i * 0.5, 0.18, volume)
    tone(1760, i * 0.5 + 0.2, 0.22, volume)
  }
}

/** Aviso previo: dos tonos suaves. */
export function warnBeeps(volume: number): void {
  unlockAudio()
  tone(880, 0, 0.15, volume * 0.7)
  tone(880, 0.25, 0.15, volume * 0.7)
}

let spanishVoice: SpeechSynthesisVoice | null | undefined

function pickVoice(): SpeechSynthesisVoice | null {
  if (spanishVoice !== undefined) return spanishVoice
  const voices = speechSynthesis.getVoices()
  if (!voices.length) return null // Aún cargando; se reintenta en la próxima llamada.
  spanishVoice =
    voices.find((v) => v.lang === 'es-CL') ??
    voices.find((v) => v.lang === 'es-419') ??
    voices.find((v) => v.lang === 'es-US' || v.lang === 'es-MX') ??
    voices.find((v) => v.lang.startsWith('es')) ??
    null
  return spanishVoice
}

export function speak(text: string): void {
  if (!('speechSynthesis' in window)) return
  speechSynthesis.cancel()
  const u = new SpeechSynthesisUtterance(text)
  const voice = pickVoice()
  if (voice) u.voice = voice
  u.lang = voice?.lang ?? 'es-CL'
  speechSynthesis.speak(u)
}

export function stopSpeaking(): void {
  if ('speechSynthesis' in window) speechSynthesis.cancel()
}

/** Chrome ignora la vibración si el usuario aún no tocó la página; se evita la llamada. */
export function vibrate(pattern: number | readonly number[]): void {
  if (!('vibrate' in navigator)) return
  if (navigator.userActivation && !navigator.userActivation.hasBeenActive) return
  navigator.vibrate(pattern as number | number[])
}
