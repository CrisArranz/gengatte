import { statOf, type Percentiles, type Pokemon, type StatKey } from '../data/schema'

/**
 * Clasificacion de rol a partir de las estadisticas BASE.
 * No se usan los valores a nivel 100 porque estan inflados por igual
 * en todos los Pokemon y no cambiarian las proporciones.
 */

/** Diferencia minima entre dos estadisticas para considerar que hay sesgo. */
const BIAS_THRESHOLD = 15

export type OffenseBias = 'physical' | 'special' | 'mixed'
export type DefenseBias = 'physical' | 'special' | 'balanced'

export interface Role {
  offense: OffenseBias
  defense: DefenseBias
  /** Estadistica ofensiva dominante; con sesgo mixto, la mayor de las dos. */
  offensiveKey: StatKey
  /** La ofensiva que el Pokemon no aprovecha. */
  unusedOffensiveKey: StatKey
  fast: boolean
  slow: boolean
  bulky: boolean
  frail: boolean
  offensive: boolean
  /** Dureza: PS + defensa + defensa especial. */
  bulk: number
  tags: string[]
  summary: string
}

export function classify(pokemon: Pokemon, percentiles: Percentiles): Role {
  const attack = statOf(pokemon, 'attack')
  const specialAttack = statOf(pokemon, 'special-attack')
  const defense = statOf(pokemon, 'defense')
  const specialDefense = statOf(pokemon, 'special-defense')
  const speed = statOf(pokemon, 'speed')
  const bulk = statOf(pokemon, 'hp') + defense + specialDefense

  const offense: OffenseBias =
    Math.abs(attack - specialAttack) < BIAS_THRESHOLD
      ? 'mixed'
      : attack > specialAttack
        ? 'physical'
        : 'special'

  const defenseBias: DefenseBias =
    Math.abs(defense - specialDefense) < BIAS_THRESHOLD
      ? 'balanced'
      : defense > specialDefense
        ? 'physical'
        : 'special'

  const offensiveKey: StatKey = attack >= specialAttack ? 'attack' : 'special-attack'
  const unusedOffensiveKey: StatKey = offensiveKey === 'attack' ? 'special-attack' : 'attack'

  const fast = speed >= percentiles.speed.p75
  const slow = speed <= percentiles.speed.p25
  const bulky = bulk >= percentiles.bulk.p75
  const frail = bulk <= percentiles.bulk.p25
  const offensive = Math.max(attack, specialAttack) >= percentiles.offense.p50

  // Las etiquetas de atacante solo tienen sentido si de verdad ataca:
  // Blissey tiene sesgo especial pero su ataque especial esta por debajo
  // de la media, asi que llamarla "atacante especial" enganaria.
  const tags: string[] = []
  if (offensive && offense === 'physical') tags.push('Atacante fisico')
  if (offensive && offense === 'special') tags.push('Atacante especial')
  if (offensive && offense === 'mixed') tags.push('Atacante mixto')
  if (defenseBias === 'physical' && bulky) tags.push('Muro fisico')
  if (defenseBias === 'special' && bulky) tags.push('Muro especial')
  if (defenseBias === 'balanced' && bulky) tags.push('Muro equilibrado')
  if (fast) tags.push('Veloz')
  if (slow) tags.push('Lento')
  if (frail) tags.push('Fragil')

  return {
    offense,
    defense: defenseBias,
    offensiveKey,
    unusedOffensiveKey,
    fast,
    slow,
    bulky,
    frail,
    offensive,
    bulk,
    tags,
    summary: buildSummary(offense, defenseBias, { fast, bulky, frail, offensive }),
  }
}

function buildSummary(
  offense: OffenseBias,
  defense: DefenseBias,
  flags: { fast: boolean; bulky: boolean; frail: boolean; offensive: boolean },
): string {
  const parts: string[] = []

  if (flags.offensive) {
    if (offense === 'physical') parts.push('Golpea mejor por el lado fisico')
    else if (offense === 'special') parts.push('Golpea mejor por el lado especial')
    else parts.push('Ataca igual de bien por ambos lados')
  } else {
    parts.push('Su fuerza no esta en atacar')
  }

  if (flags.bulky) {
    if (defense === 'physical') parts.push('aguanta bien los golpes fisicos')
    else if (defense === 'special') parts.push('aguanta bien los golpes especiales')
    else parts.push('aguanta bien por ambos lados')
  } else if (flags.frail) {
    parts.push('cae rapido si le alcanzan')
  }

  if (flags.fast) parts.push('y suele atacar primero')

  return `${parts.join(', ').replace(', y ', ' y ')}.`
}
