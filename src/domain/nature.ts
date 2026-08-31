import {
  STAT_LABEL_ES,
  statOf,
  type Nature,
  type Percentiles,
  type Pokemon,
  type StatKey,
} from '@/data/schema'
import { classify, type Role } from '@/domain/role'
import { NATURE_BENEFICIAL, NATURE_HINDERING, statWithNature } from '@/domain/stats'

/**
 * Recomendacion de naturaleza a partir de las estadisticas base (PLAN.md 3.6).
 *
 * Aviso: no considera movimientos, habilidad, objeto ni formato de combate.
 * Es una orientacion, no una verdad competitiva.
 */

export const NATURE_DISCLAIMER =
  'Calculado solo con las estadisticas base. El mejor juego real depende tambien de movimientos, habilidad, objeto y formato de combate.'

export interface NatureSuggestion {
  nature: Nature
  up: StatKey
  down: StatKey
  /** Valor a nivel 100 con IV 31 y EV 252 tras aplicar la naturaleza. */
  upValue: number
  downValue: number
  reason: string
}

interface Candidate {
  up: StatKey
  down: StatKey
  reason: string
}

function candidatesFor(pokemon: Pokemon, role: Role): Candidate[] {
  const { offensiveKey, unusedOffensiveKey } = role
  const offensiveLabel = STAT_LABEL_ES[offensiveKey].toLowerCase()
  const unusedLabel = STAT_LABEL_ES[unusedOffensiveKey].toLowerCase()

  // Bajar la ofensiva que no usa es casi gratis. Ademas, si es atacante
  // especial, bajar el ataque reduce el dano recibido de Judo y de la confusion.
  const freeDrop =
    unusedOffensiveKey === 'attack'
      ? `sacrificando el ${unusedLabel}, que no usa (y que ademas reduce el dano que recibe de Judo y de la confusion)`
      : `sacrificando el ${unusedLabel}, que no usa`

  const candidates: Candidate[] = []

  if (role.offensive) {
    const speedFirst: Candidate = {
      up: 'speed',
      down: unusedOffensiveKey,
      reason: `Maxima velocidad ${freeDrop}. Adelantarse suele decidir el combate antes que pegar mas fuerte.`,
    }
    const powerFirst: Candidate = {
      up: offensiveKey,
      down: unusedOffensiveKey,
      reason: `Refuerza su ${offensiveLabel}, su mejor via de dano, ${freeDrop}.`,
    }

    // A un Pokemon lento no se le recomienda subir la velocidad: partiendo de
    // una base tan baja, un 10 % mas no le hace adelantar a casi nadie.
    if (role.slow) {
      candidates.push(powerFirst)
    } else {
      candidates.push(...(role.fast ? [speedFirst, powerFirst] : [powerFirst, speedFirst]))
    }

    // Si de todas formas es lento, la velocidad no le aporta nada.
    if (role.slow) {
      candidates.push({
        up: offensiveKey,
        down: 'speed',
        reason: `Alternativa: ya es lento, asi que renunciar del todo a la velocidad para maximizar su ${offensiveLabel} apenas cuesta nada.`,
      })
    }
  } else {
    // Perfil defensivo: reforzar la defensa mas alta rinde mas que parchear
    // la mas baja, porque el dano recibido escala de forma inversa a la defensa.
    const defense = statOf(pokemon, 'defense')
    const specialDefense = statOf(pokemon, 'special-defense')
    const strongest: StatKey = defense >= specialDefense ? 'defense' : 'special-defense'
    const weakest: StatKey = strongest === 'defense' ? 'special-defense' : 'defense'

    candidates.push({
      up: strongest,
      down: unusedOffensiveKey,
      reason: `Refuerza su ${STAT_LABEL_ES[strongest].toLowerCase()}, que ya es su mejor defensa, ${freeDrop}.`,
    })
    candidates.push({
      up: weakest,
      down: unusedOffensiveKey,
      reason: `Alternativa: cubre su ${STAT_LABEL_ES[weakest].toLowerCase()}, el lado por el que mas le entra el dano, ${freeDrop}.`,
    })

    if (role.slow) {
      candidates.push({
        up: strongest,
        down: 'speed',
        reason: `Alternativa: al ser lento, la velocidad es lo que menos le cuesta perder.`,
      })
    }
  }

  return candidates
}

export function suggestNatures(
  pokemon: Pokemon,
  natures: Nature[],
  percentiles: Percentiles,
  limit = 3,
): NatureSuggestion[] {
  const role = classify(pokemon, percentiles)
  const suggestions: NatureSuggestion[] = []
  const seen = new Set<number>()

  for (const candidate of candidatesFor(pokemon, role)) {
    if (candidate.up === candidate.down) continue

    const nature = natures.find(
      (entry) => entry.up === candidate.up && entry.down === candidate.down,
    )
    if (!nature || seen.has(nature.id)) continue
    seen.add(nature.id)

    suggestions.push({
      nature,
      up: candidate.up,
      down: candidate.down,
      upValue: statWithNature(pokemon, candidate.up, NATURE_BENEFICIAL),
      downValue: statWithNature(pokemon, candidate.down, NATURE_HINDERING),
      reason: candidate.reason,
    })

    if (suggestions.length >= limit) break
  }

  return suggestions
}
