import { CLOCK_TICK_MS } from '../config'

/** Hora actual reactiva. Los componentes leen `clock.now` para refrescarse. */
export const clock = $state({ now: Date.now() })

/** Arranca el reloj. `onTick` recibe la hora en cada paso y al volver a primer plano. */
export function startClock(onTick: (now: number) => void): () => void {
  const tick = () => {
    clock.now = Date.now()
    onTick(clock.now)
  }
  tick()
  const timer = setInterval(tick, CLOCK_TICK_MS)
  document.addEventListener('visibilitychange', tick)
  return () => {
    clearInterval(timer)
    document.removeEventListener('visibilitychange', tick)
  }
}
