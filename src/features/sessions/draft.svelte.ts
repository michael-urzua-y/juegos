import type { Session } from './model'

/** Formulario de nuevo turno. Es compartido para poder "Repetir" un turno desde otra vista. */
export const draft = $state({ name: '', note: '', game: '', planMinutes: 10 })

export function prefillDraft(s: Pick<Session, 'name' | 'note' | 'game'>): void {
  draft.name = s.name
  draft.note = s.note
  draft.game = s.game
}
