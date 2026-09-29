import type { IconName } from '@/shared/ui/Icon.svelte'

export type View = 'play' | 'summary' | 'settings'

export const VIEWS: readonly { id: View; label: string; title: string; icon: IconName }[] = [
  { id: 'play', label: 'En juego', title: 'Turnos', icon: 'timer' },
  { id: 'summary', label: 'Resumen', title: 'Resumen', icon: 'chart' },
  { id: 'settings', label: 'Ajustes', title: 'Ajustes', icon: 'settings' },
]

export const nav = $state({ view: 'play' as View })

export const currentView = () => VIEWS.find((v) => v.id === nav.view) ?? VIEWS[0]
