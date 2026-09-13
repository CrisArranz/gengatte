import { createContext, useContext } from 'react'

export interface TeamContextValue {
  ids: number[]
  isFull: boolean
  has: (id: number) => boolean
  add: (id: number) => void
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
