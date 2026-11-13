import type { Session } from './model'

/** Formulario de nuevo turno. Es compartido para poder "Repetir" un turno desde otra vista. */
export const draft = $state({ name: '', note: '', game: '', planMinutes: 10 })

/** Niño del turno que se está repitiendo, mientras no se cambie su nombre o nota. */
let repeated: Pick<Session, 'name' | 'note' | 'kidId'> | null = null

export function prefillDraft(s: Pick<Session, 'name' | 'note' | 'game' | 'kidId'>): void {
  draft.name = s.name
  draft.note = s.note
  draft.game = s.game
  repeated = { name: s.name, note: s.note, kidId: s.kidId }
}

/** El niño repetido, si el formulario sigue con su mismo nombre y nota; si no, es un niño nuevo. */
export function repeatedKidId(): string | undefined {
  if (!repeated || !repeated.kidId) return undefined
  const same = draft.name.trim() === repeated.name && draft.note.trim() === repeated.note
  return same ? repeated.kidId : undefined
}

export const clearRepeated = () => void (repeated = null)
