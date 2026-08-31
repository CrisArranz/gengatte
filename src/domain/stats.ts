import { STAT_INDEX, type Pokemon, type StatKey } from '@/data/schema'

/**
 * Formulas de estadisticas de la tercera generacion en adelante.
 *
 *   PS    = floor( (2*Base + IV + floor(EV/4)) * Nivel / 100 ) + Nivel + 10
 *   Resto = floor( ( floor( (2*Base + IV + floor(EV/4)) * Nivel / 100 ) + 5 ) * Naturaleza )
 *
 * Los PS nunca se ven afectados por la naturaleza.
 */

export const MAX_LEVEL = 100
export const IV_MAX = 31
export const EV_MAX = 252

export const NATURE_HINDERING = 0.9
export const NATURE_NEUTRAL = 1
export const NATURE_BENEFICIAL = 1.1

/** Shedinja tiene 1 PS por diseno, sin importar IV, EV ni nivel. */
const SHEDINJA_ID = 292

function core(base: number, iv: number, ev: number, level: number): number {
  return Math.floor(((2 * base + iv + Math.floor(ev / 4)) * level) / 100)
}

export function hpAt(base: number, level = MAX_LEVEL, iv = IV_MAX, ev = EV_MAX): number {
  return core(base, iv, ev, level) + level + 10
}

export function statAt(
  base: number,
  level = MAX_LEVEL,
  iv = IV_MAX,
  ev = EV_MAX,
  nature: number = NATURE_NEUTRAL,
): number {
  return Math.floor((core(base, iv, ev, level) + 5) * nature)
}

export interface StatRange {
  key: StatKey
  base: number
  /** IV 0, EV 0 y naturaleza perjudicial. */
  min: number
  /** IV 31, EV 0 y naturaleza neutra: el valor realista de referencia. */
  neutral: number
  /** IV 31, EV 252 y naturaleza beneficiosa. */
  max: number
}

const STAT_KEYS: StatKey[] = [
  'hp',
  'attack',
  'defense',
  'special-attack',
  'special-defense',
  'speed',
]

export function statRange(pokemon: Pokemon, key: StatKey, level = MAX_LEVEL): StatRange {
  const base = pokemon.stats[STAT_INDEX[key]]

  if (key === 'hp') {
    const fixed = pokemon.id === SHEDINJA_ID
    return {
      key,
      base,
      min: fixed ? 1 : hpAt(base, level, 0, 0),
      neutral: fixed ? 1 : hpAt(base, level, IV_MAX, 0),
      max: fixed ? 1 : hpAt(base, level, IV_MAX, EV_MAX),
    }
  }

  return {
    key,
    base,
    min: statAt(base, level, 0, 0, NATURE_HINDERING),
    neutral: statAt(base, level, IV_MAX, 0, NATURE_NEUTRAL),
    max: statAt(base, level, IV_MAX, EV_MAX, NATURE_BENEFICIAL),
  }
}

export function statRanges(pokemon: Pokemon, level = MAX_LEVEL): StatRange[] {
  return STAT_KEYS.map((key) => statRange(pokemon, key, level))
}

/** Valor a nivel maximo con IV y EV al maximo, aplicando la naturaleza indicada. */
export function statWithNature(
  pokemon: Pokemon,
  key: StatKey,
  modifier: number,
  level = MAX_LEVEL,
): number {
  const base = pokemon.stats[STAT_INDEX[key]]
  if (key === 'hp') return pokemon.id === SHEDINJA_ID ? 1 : hpAt(base, level, IV_MAX, EV_MAX)
  return statAt(base, level, IV_MAX, EV_MAX, modifier)
}

export const baseStatTotal = (pokemon: Pokemon): number =>
  pokemon.stats.reduce((total, value) => total + value, 0)
