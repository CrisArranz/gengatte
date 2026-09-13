import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { TeamContext } from '@/data/teamContext'
import { MAX_TEAM_SIZE } from '@/domain/team'

const STORAGE_KEY = 'gengatte:team'

function readStoredIds(): number[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter((value): value is number => typeof value === 'number')
  } catch {
    return []
  }
}

/** Equipo de hasta seis Pokemon, recordado en localStorage por navegador. */
export function TeamProvider({ children }: { children: ReactNode }) {
  const [ids, setIds] = useState<number[]>(readStoredIds)

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(ids))
    } catch {
      // Modo privado o almacenamiento bloqueado: el equipo sigue funcionando,
      // solo que no se recuerda en la proxima visita.
    }
  }, [ids])

  const add = useCallback((id: number) => {
    setIds((current) => {
      if (current.includes(id) || current.length >= MAX_TEAM_SIZE) return current
      return [...current, id]
    })
  }, [])

  const remove = useCallback((id: number) => {
    setIds((current) => current.filter((existing) => existing !== id))
  }, [])

  const has = useCallback((id: number) => ids.includes(id), [ids])

  return (
    <TeamContext value={{ ids, isFull: ids.length >= MAX_TEAM_SIZE, has, add, remove }}>
      {children}
    </TeamContext>
  )
}
