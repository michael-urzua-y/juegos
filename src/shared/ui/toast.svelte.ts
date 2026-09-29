// Avisos breves en pantalla ("Mateo empezó · 10 min").

const DURATION_MS = 2_500

export const toasts: { id: number; message: string }[] = $state([])

let nextId = 1

export function toast(message: string): void {
  const id = nextId++
  toasts.push({ id, message })
  setTimeout(() => {
    const i = toasts.findIndex((t) => t.id === id)
    if (i >= 0) toasts.splice(i, 1)
  }, DURATION_MS)
}
