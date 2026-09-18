import { createContext, useContext } from 'react'

export type SlotGroup = 'team' | 'bench'

export interface SlotRef {
  group: SlotGroup
  index: number
}

export interface TeamContextValue {
  /** Titulares por posición fija; `null` es un hueco vacío. Longitud MAX_TEAM_SIZE. */
  team: (number | null)[]
  /** Banquillo por posición fija; `null` es un hueco vacío. Longitud BENCH_SIZE. */
  bench: (number | null)[]
  /** Titulares y banquillo completos: ya no hay hueco para nadie más. */
  isFull: boolean
  has: (id: number) => boolean
  /** Titulares primero; si están completos, va al banquillo. No-op si ambos lo están. */
  add: (id: number) => void
  /** Quita al Pokemon de donde esté, titulares o banquillo. */
  remove: (id: number) => void
  /** Intercambia el contenido de dos huecos (o mueve, si el destino está vacío). */
  move: (from: SlotRef, to: SlotRef) => void
}

export const TeamContext = createContext<TeamContextValue | undefined>(undefined)

export function useTeam(): TeamContextValue {
  const value = useContext(TeamContext)
  if (!value) {
    throw new Error('useTeam() usado fuera de <TeamProvider>')
  }
  return value
}
