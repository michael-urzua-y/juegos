import type { Tone } from './model'

/** Colores por estado del turno, compartidos por todas las vistas. */
export const TONE_STYLES: Record<Tone, { text: string; bar: string; badge: string; ring: string }> = {
  ok: {
    text: 'text-emerald-600 dark:text-emerald-400',
    bar: 'bg-emerald-500',
    badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
    ring: '',
  },
  warn: {
    text: 'text-amber-500',
    bar: 'bg-amber-400',
    badge: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
    ring: 'ring-2! ring-amber-400!',
  },
  alarm: {
    text: 'text-red-600 dark:text-red-400',
    bar: 'bg-red-500',
    badge: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300',
    ring: 'ring-4! ring-red-500!',
  },
  paused: {
    text: 'text-zinc-400',
    bar: 'bg-zinc-400',
    badge: 'bg-zinc-200 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300',
    ring: '',
  },
  done: {
    text: 'text-zinc-400',
    bar: 'bg-zinc-300',
    badge: 'bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400',
    ring: '',
  },
}
