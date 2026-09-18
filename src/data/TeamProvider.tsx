import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { TeamContext } from '@/data/teamContext'
import { BENCH_SIZE, MAX_TEAM_SIZE } from '@/domain/team'

const STORAGE_KEY = 'gengatte:team'

function toIdList(value: unknown): number[] {
  if (!Array.isArray(value)) return []
  return value.filter((entry): entry is number => typeof entry === 'number')
}

interface StoredTeam {
  ids: number[]
  benchIds: number[]
}

function readStoredTeam(): StoredTeam {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { ids: [], benchIds: [] }
    const parsed: unknown = JSON.parse(raw)

    // Formato antiguo: un array plano de ids de titulares, sin banquillo.
    if (Array.isArray(parsed)) return { ids: toIdList(parsed), benchIds: [] }

    if (parsed && typeof parsed === 'object') {
      const record = parsed as Record<string, unknown>
      return { ids: toIdList(record.ids), benchIds: toIdList(record.benchIds) }
    }

    return { ids: [], benchIds: [] }
  } catch {
    return { ids: [], benchIds: [] }
  }
}

/** Equipo de hasta seis titulares y cuatro reservas, recordado en localStorage por navegador. */
export function TeamProvider({ children }: { children: ReactNode }) {
  const [{ ids, benchIds }, setTeam] = useState<StoredTeam>(readStoredTeam)

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ ids, benchIds }))
    } catch {
      // Modo privado o almacenamiento bloqueado: el equipo sigue funcionando,
      // solo que no se recuerda en la proxima visita.
    }
  }, [ids, benchIds])

  const add = useCallback((id: number) => {
    setTeam((current) => {
      if (current.ids.includes(id) || current.benchIds.includes(id)) return current
      if (current.ids.length < MAX_TEAM_SIZE) {
        return { ...current, ids: [...current.ids, id] }
      }
      if (current.benchIds.length < BENCH_SIZE) {
        return { ...current, benchIds: [...current.benchIds, id] }
      }
      return current
    })
  }, [])

  const remove = useCallback((id: number) => {
    setTeam((current) => ({
      ids: current.ids.filter((existing) => existing !== id),
      benchIds: current.benchIds.filter((existing) => existing !== id),
    }))
  }, [])

  const has = useCallback((id: number) => ids.includes(id) || benchIds.includes(id), [ids, benchIds])

  const isFull = ids.length >= MAX_TEAM_SIZE && benchIds.length >= BENCH_SIZE

  return <TeamContext value={{ ids, benchIds, isFull, has, add, remove }}>{children}</TeamContext>
}
