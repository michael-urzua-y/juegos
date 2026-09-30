// Cliente de la API (/api, mismo dominio). La sesión viaja en una cookie HttpOnly que
// JavaScript no puede leer; aquí solo se agrega la cabecera anti-CSRF que exige el servidor.

export class ApiError extends Error {
  constructor(
    /** Código HTTP; 0 si no hubo conexión. */
    readonly status: number,
    /** Código de error de la API: "invalid_credentials", "active_elsewhere", "offline"… */
    readonly code: string,
    message: string,
    /** Cuerpo completo de la respuesta, con datos extra (dispositivo activo, contacto…). */
    readonly body: Record<string, unknown> = {},
  ) {
    super(message)
  }

  get offline() {
    return this.status === 0
  }
}

const TIMEOUT_MS = 15_000

export async function api<T>(method: 'GET' | 'POST' | 'PUT', path: string, body?: unknown): Promise<T> {
  let res: Response
  try {
    res = await fetch(`/api${path}`, {
      method,
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'turnos' },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    })
  } catch {
    throw new ApiError(0, 'offline', 'Sin conexión. Revisa tu internet e intenta de nuevo.')
  }
  if (res.status === 204) return undefined as T
  let data: Record<string, unknown> = {}
  try {
    data = await res.json()
  } catch {
    // Respuesta sin JSON (p. ej. un error del proxy)
  }
  if (!res.ok) {
    const message = typeof data.message === 'string' ? data.message : 'Ocurrió un error. Intenta de nuevo.'
    throw new ApiError(res.status, typeof data.error === 'string' ? data.error : 'http_error', message, data)
  }
  return data as T
}
