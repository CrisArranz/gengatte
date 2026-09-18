import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { TeamContext, type SlotGroup, type SlotRef } from '@/data/teamContext'
import { BENCH_SIZE, MAX_TEAM_SIZE } from '@/domain/team'

const STORAGE_KEY = 'gengatte:team'

interface SlotState {
  team: (number | null)[]
  bench: (number | null)[]
}

function emptySlots(size: number): (number | null)[] {
  return Array.from({ length: size }, () => null)
}

function emptyState(): SlotState {
  return { team: emptySlots(MAX_TEAM_SIZE), bench: emptySlots(BENCH_SIZE) }
}

function toIdList(value: unknown): number[] {
  if (!Array.isArray(value)) return []
  return value.filter((entry): entry is number => typeof entry === 'number')
}

/** Coloca una lista compacta de ids en huecos fijos, en orden, rellenando el resto con null. */
function toSlots(ids: number[], size: number): (number | null)[] {
  const slots = emptySlots(size)
  ids.slice(0, size).forEach((id, index) => {
    slots[index] = id
  })
  return slots
}

/** Igual que toSlots, pero a partir de un array que ya puede traer huecos (null/otros). */
function toFixedSlots(value: unknown, size: number): (number | null)[] {
  if (!Array.isArray(value)) return emptySlots(size)
  const slots = emptySlots(size)
  for (let index = 0; index < size; index++) {
    const entry = value[index]
    slots[index] = typeof entry === 'number' ? entry : null
  }
  return slots
}

function readStoredTeam(): SlotState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return emptyState()
    const parsed: unknown = JSON.parse(raw)

    // Formato original: array plano de ids de titulares, sin banquillo ni posiciones.
    if (Array.isArray(parsed)) {
      return { team: toSlots(toIdList(parsed), MAX_TEAM_SIZE), bench: emptySlots(BENCH_SIZE) }
    }

    if (parsed && typeof parsed === 'object') {
      const record = parsed as Record<string, unknown>

      // Formato con posiciones fijas (el actual).
      if (Array.isArray(record.team) || Array.isArray(record.bench)) {
        return {
          team: toFixedSlots(record.team, MAX_TEAM_SIZE),
          bench: toFixedSlots(record.bench, BENCH_SIZE),
        }
      }

      // Formato intermedio: {ids, benchIds} compactos, sin posiciones fijas.
      return {
        team: toSlots(toIdList(record.ids), MAX_TEAM_SIZE),
        bench: toSlots(toIdList(record.benchIds), BENCH_SIZE),
      }
    }

    return emptyState()
  } catch {
    return emptyState()
  }
}

/** Equipo de seis huecos titulares y cuatro de banquillo, recordado en localStorage por navegador. */
export function TeamProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<SlotState>(readStoredTeam)

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    } catch {
      // Modo privado o almacenamiento bloqueado: el equipo sigue funcionando,
      // solo que no se recuerda en la proxima visita.
    }
  }, [state])

  const add = useCallback((id: number) => {
    setState((current) => {
      if (current.team.includes(id) || current.bench.includes(id)) return current

      const teamIndex = current.team.indexOf(null)
      if (teamIndex !== -1) {
        const team = [...current.team]
        team[teamIndex] = id
        return { ...current, team }
      }

      const benchIndex = current.bench.indexOf(null)
      if (benchIndex !== -1) {
        const bench = [...current.bench]
        bench[benchIndex] = id
        return { ...current, bench }
      }

      return current
    })
  }, [])

  const remove = useCallback((id: number) => {
    setState((current) => ({
      team: current.team.map((slot) => (slot === id ? null : slot)),
      bench: current.bench.map((slot) => (slot === id ? null : slot)),
    }))
  }, [])

  const move = useCallback((from: SlotRef, to: SlotRef) => {
    if (from.group === to.group && from.index === to.index) return
    setState((current) => {
      const next: SlotState = { team: [...current.team], bench: [...current.bench] }
      const source = next[from.group as SlotGroup]
      const target = next[to.group as SlotGroup]
      const temp = target[to.index]
      target[to.index] = source[from.index]
      source[from.index] = temp
      return next
    })
  }, [])

  const has = useCallback(
    (id: number) => state.team.includes(id) || state.bench.includes(id),
    [state],
  )

  const isFull =
    state.team.every((slot) => slot !== null) && state.bench.every((slot) => slot !== null)

  return (
    <TeamContext value={{ team: state.team, bench: state.bench, isFull, has, add, remove, move }}>
      {children}
    </TeamContext>
  )
}
