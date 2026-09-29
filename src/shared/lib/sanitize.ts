// Validación de todo lo que entra a la app: lo que escribe el usuario y lo que se lee
// de localStorage (que puede estar corrupto o haber sido editado a mano).

// Caracteres de control y de dirección de texto (bidi) que pueden desordenar la UI.
// eslint-disable-next-line no-control-regex
const UNSAFE_CHARS = /[\u0000-\u001f\u007f-\u009f​-‏‪-‮⁦-⁩﻿]/g

export function cleanText(value: unknown, maxLength: number): string {
  if (typeof value !== 'string') return ''
  return value.replace(UNSAFE_CHARS, '').replace(/\s+/g, ' ').trim().slice(0, maxLength)
}

export function clampInt(value: unknown, min: number, max: number, fallback: number): number {
  const n = typeof value === 'number' ? value : typeof value === 'string' && value.trim() ? Number(value) : NaN
  if (!Number.isFinite(n)) return fallback
  return Math.min(max, Math.max(min, Math.round(n)))
}

/** Entero positivo hasta `max`, o 0 si no es válido (a diferencia de clampInt, no sube al mínimo). */
export function positiveInt(value: unknown, max: number): number {
  const n = clampInt(value, 0, max, 0)
  return n >= 1 ? n : 0
}

export const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v)

export const isFiniteNumber = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v)

/** Texto comparable: "Sofía" y "sofia" quedan iguales. Para búsquedas y agrupar nombres. */
export const foldText = (text: string) =>
  text
    .toLocaleLowerCase('es')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
