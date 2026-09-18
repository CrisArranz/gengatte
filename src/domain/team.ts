import type { TypeInfo } from '@/data/schema'
import type { TypeChart } from '@/domain/typeChart'

export const MAX_TEAM_SIZE = 6
export const BENCH_SIZE = 4

export interface TeamWeakness {
  type: TypeInfo
  count: number
}

/** Tipos a los que un solo Pokemon es debil (x2 o x4), sin agrupar por multiplicador. */
export function memberWeaknesses(chart: TypeChart, types: readonly string[]): TypeInfo[] {
  return chart
    .defensiveProfile(types)
    .filter((effect) => effect.multiplier >= 2)
    .map((effect) => effect.type)
}

/**
 * Por cada tipo, a cuantos miembros del equipo golpearia con x2 o x4.
 *
 * Cuenta Pokemon debiles, no multiplicadores: Gyarados (x4) y Lapras (x2)
 * debiles a rayo cuentan como 2, no como una suma de multiplicadores.
 */
export function teamWeaknesses(
  chart: TypeChart,
  membersTypes: readonly (readonly string[])[],
): TeamWeakness[] {
  const counts = new Map<number, TeamWeakness>()

  for (const types of membersTypes) {
    for (const type of memberWeaknesses(chart, types)) {
      const entry = counts.get(type.id)
      if (entry) entry.count += 1
      else counts.set(type.id, { type, count: 1 })
    }
  }

  return [...counts.values()].sort((a, b) => b.count - a.count || a.type.id - b.type.id)
}
