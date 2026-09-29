import { describe, expect, it } from 'vitest'
import { DAY, MINUTE } from '@/shared/lib/time'
import {
  advanceSession,
  compareActive,
  createSession,
  extendSession,
  finishSession,
  parseSessions,
  pauseSession,
  progress,
  remainingMs,
  resumeSession,
  sessionTone,
  type Session,
} from './model'

const T0 = new Date('2026-09-29T15:00:00').getTime()
const WARN = 1 * MINUTE

function make(minutes = 10, overrides: Partial<Session> = {}): Session {
  const s = createSession({ name: 'Mateo', game: 'Castillo', plan: { minutes, price: 2000 } }, T0, WARN, 'id-1')
  if (!s) throw new Error('no session')
  return { ...s, ...overrides }
}

describe('createSession', () => {
  it('guarda la hora de término a partir de ahora', () => {
    const s = make(10)
    expect(s.endsAt).toBe(T0 + 10 * MINUTE)
    expect(s.status).toBe('running')
    expect(remainingMs(s, T0 + 3 * MINUTE)).toBe(7 * MINUTE)
  })

  it('limpia el nombre y rechaza nombres vacíos', () => {
    const plan = { minutes: 5, price: 0 }
    expect(createSession({ name: '  Ana\u0000 ‮ María  ', game: '', plan }, T0, WARN, 'x')?.name).toBe('Ana María')
    expect(createSession({ name: '   ', game: '', plan }, T0, WARN, 'x')).toBeNull()
    expect(createSession({ name: 'a'.repeat(200), game: '', plan }, T0, WARN, 'x')?.name).toHaveLength(40)
  })

  it('rechaza minutos inválidos y limita precios', () => {
    expect(createSession({ name: 'Leo', game: '', plan: { minutes: 0, price: 0 } }, T0, WARN, 'x')).toBeNull()
    expect(createSession({ name: 'Leo', game: '', plan: { minutes: 5, price: -50 } }, T0, WARN, 'x')?.price).toBe(0)
  })

  it('marca como avisado un turno más corto que el aviso previo', () => {
    expect(make(1).warned).toBe(true)
    expect(make(5).warned).toBe(false)
  })
})

describe('advanceSession', () => {
  it('avisa una sola vez al entrar al último minuto', () => {
    const s = make(5)
    expect(advanceSession(s, T0 + 3 * MINUTE, WARN)).toBeNull()
    expect(advanceSession(s, T0 + 4 * MINUTE + 1, WARN)).toBe('warned')
    expect(advanceSession(s, T0 + 4 * MINUTE + 2, WARN)).toBeNull()
  })

  it('pasa a alarma al llegar a la hora de término', () => {
    const s = make(5)
    expect(advanceSession(s, T0 + 5 * MINUTE, WARN)).toBe('ended')
    expect(s.status).toBe('alarm')
    expect(s.finishedAt).toBe(T0 + 5 * MINUTE)
    expect(advanceSession(s, T0 + 6 * MINUTE, WARN)).toBeNull()
  })

  it('detecta el término aunque el reloj salte (app en segundo plano)', () => {
    const s = make(5)
    expect(advanceSession(s, T0 + 60 * MINUTE, WARN)).toBe('ended')
  })

  it('sin aviso previo cuando está desactivado', () => {
    const s = make(5)
    expect(advanceSession(s, T0 + 4.5 * MINUTE, 0)).toBeNull()
  })
})

describe('pausa y extensión', () => {
  it('congela el tiempo al pausar y lo retoma al seguir', () => {
    const s = make(10)
    pauseSession(s, T0 + 4 * MINUTE)
    expect(remainingMs(s, T0 + 9 * MINUTE)).toBe(6 * MINUTE)
    resumeSession(s, T0 + 9 * MINUTE)
    expect(s.endsAt).toBe(T0 + 15 * MINUTE)
  })

  it('extender un turno en curso suma tiempo y precio', () => {
    const s = make(10)
    extendSession(s, T0, { minutes: 5, price: 1000 }, WARN)
    expect(s.endsAt).toBe(T0 + 15 * MINUTE)
    expect(s.minutes).toBe(15)
    expect(s.price).toBe(3000)
  })

  it('extender una alarma reinicia desde ahora', () => {
    const s = make(5)
    advanceSession(s, T0 + 7 * MINUTE, WARN)
    extendSession(s, T0 + 7 * MINUTE, { minutes: 5, price: 1000 }, WARN)
    expect(s.status).toBe('running')
    expect(s.endsAt).toBe(T0 + 12 * MINUTE)
    expect(s.finishedAt).toBeNull()
  })

  it('extender un turno pausado suma al tiempo congelado', () => {
    const s = make(10)
    pauseSession(s, T0 + 2 * MINUTE)
    extendSession(s, T0 + 3 * MINUTE, { minutes: 5, price: 0 }, WARN)
    expect(s.pausedRemainingMs).toBe(13 * MINUTE)
  })

  it('no se puede extender un turno terminado', () => {
    const s = make(10)
    finishSession(s, T0 + MINUTE)
    extendSession(s, T0 + 2 * MINUTE, { minutes: 5, price: 1000 }, WARN)
    expect(s.price).toBe(2000)
  })
})

describe('presentación', () => {
  it('calcula progreso y tono', () => {
    const s = make(10)
    expect(progress(s, T0 + 5 * MINUTE)).toBeCloseTo(0.5)
    expect(sessionTone(s, T0, WARN)).toBe('ok')
    expect(sessionTone(s, T0 + 9.5 * MINUTE, WARN)).toBe('warn')
  })

  it('ordena alarmas primero, luego por hora de salida y pausados al final', () => {
    const a = make(10, { id: 'a' })
    const b = make(5, { id: 'b' })
    const c = make(3, { id: 'c', status: 'paused', pausedRemainingMs: MINUTE })
    const d = make(20, { id: 'd', status: 'alarm' })
    expect([a, b, c, d].sort(compareActive).map((s) => s.id)).toEqual(['d', 'b', 'a', 'c'])
  })
})

describe('parseSessions', () => {
  it('descarta datos corruptos o manipulados', () => {
    const good = make(10)
    const raw = [
      good,
      { ...good, id: 'dup' },
      { ...good, id: 'dup' },
      { ...good, id: 'bad-status', status: 'hacked' },
      { ...good, id: 'no-name', name: '' },
      { ...good, id: 'bad-time', endsAt: 'mañana' },
      { ...good, id: 'xss', name: '<img src=x onerror=alert(1)>' },
      null,
      'texto',
    ]
    const parsed = parseSessions(raw, T0)
    expect(parsed.map((s) => s.id)).toEqual(['id-1', 'dup', 'xss'])
    // El texto se guarda tal cual: Svelte lo escapa al mostrarlo, nunca se interpreta como HTML.
    expect(parsed[2].name).toBe('<img src=x onerror=alert(1)>')
  })

  it('elimina el historial antiguo pero conserva turnos activos', () => {
    const old = { ...make(10), id: 'old', status: 'done', startedAt: T0 - 90 * DAY }
    const oldActive = { ...make(10), id: 'old-active', startedAt: T0 - 90 * DAY }
    expect(parseSessions([old, oldActive], T0).map((s) => s.id)).toEqual(['old-active'])
  })

  it('devuelve lista vacía si no es un arreglo', () => {
    expect(parseSessions(undefined, T0)).toEqual([])
    expect(parseSessions({ a: 1 }, T0)).toEqual([])
  })
})
