import { createContext, useContext } from 'react'

export interface TeamContextValue {
  ids: number[]
  benchIds: number[]
  /** Titulares y banquillo completos: ya no hay hueco para nadie más. */
  isFull: boolean
  has: (id: number) => boolean
  /** Titulares primero; si están completos, va al banquillo. No-op si ambos lo están. */
  add: (id: number) => void
  /** Quita al Pokemon de donde esté, titulares o banquillo. */
  remove: (id: number) => void
}

export const TeamContext = createContext<TeamContextValue | undefined>(undefined)

export function useTeam(): TeamContextValue {
  const value = useContext(TeamContext)
  if (!value) {
    throw new Error('useTeam() usado fuera de <TeamProvider>')
  }
  return value
}
