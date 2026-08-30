/** Formas de los JSON que genera scripts/build-data.mjs. */

export type StatKey = 'hp' | 'attack' | 'defense' | 'special-attack' | 'special-defense' | 'speed'

/** Estadisticas base en el orden fijo del dataset: hp, atk, def, spa, spd, spe. */
export type StatArray = readonly [number, number, number, number, number, number]

export const STAT_INDEX: Record<StatKey, number> = {
  hp: 0,
  attack: 1,
  defense: 2,
  'special-attack': 3,
  'special-defense': 4,
  speed: 5,
}

export const STAT_LABEL_ES: Record<StatKey, string> = {
  hp: 'PS',
  attack: 'Ataque',
  defense: 'Defensa',
  'special-attack': 'Ataque especial',
  'special-defense': 'Defensa especial',
  speed: 'Velocidad',
}

export interface Pokemon {
  id: number
  name: string
  nameEs: string
  genus: string
  gen: number
  types: string[]
  stats: StatArray
  height: number
  weight: number
}

/** Umbrales relativos al conjunto real de 1025 Pokemon. */
export interface Percentiles {
  speed: { p25: number; p75: number; p90: number }
  bulk: { p25: number; p75: number; p90: number }
  offense: { p50: number; p75: number }
}

export interface Pokedex {
  generatedAt: string
  statOrder: StatKey[]
  percentiles: Percentiles
  pokemon: Pokemon[]
}

export interface TypeInfo {
  id: number
  name: string
  nameEs: string
}

export interface Nature {
  id: number
  name: string
  nameEs: string
  /** null en las cinco naturalezas neutras. */
  up: StatKey | null
  down: StatKey | null
}

export interface Reference {
  generatedAt: string
  types: TypeInfo[]
  /** chart[atacante][defensor], con los tipos en el orden de `types`. */
  chart: number[][]
  natures: Nature[]
}

export function statOf(pokemon: Pokemon, key: StatKey): number {
  return pokemon.stats[STAT_INDEX[key]]
}
