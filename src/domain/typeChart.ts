import type { Reference, TypeInfo } from '../data/schema'

/** Multiplicadores posibles al combinar como mucho dos tipos. */
export type Multiplier = 0 | 0.25 | 0.5 | 1 | 2 | 4

/** Orden de presentacion: de lo mas peligroso a lo inofensivo. */
export const DEFENSIVE_ORDER: Multiplier[] = [4, 2, 1, 0.5, 0.25, 0]

/** En ataque no existen ni x4 ni x0.25: los tipos del atacante no se multiplican entre si. */
export const OFFENSIVE_ORDER: Multiplier[] = [2, 1, 0.5, 0]

export interface TypeEffect {
  type: TypeInfo
  multiplier: Multiplier
}

export interface EffectGroup {
  multiplier: Multiplier
  label: string
  types: TypeInfo[]
}

export const MULTIPLIER_LABEL: Record<Multiplier, string> = {
  4: 'x4',
  2: 'x2',
  1: 'x1',
  0.5: 'x½',
  0.25: 'x¼',
  0: 'x0',
}

export class TypeChart {
  // Sin propiedades de parametro: esa sintaxis no es borrable y obliga a
  // transpilar en vez de solo eliminar los tipos.
  readonly reference: Reference
  private readonly indexByName: Map<string, number>

  constructor(reference: Reference) {
    this.reference = reference
    this.indexByName = new Map(reference.types.map((type, index) => [type.name, index]))
  }

  get types(): TypeInfo[] {
    return this.reference.types
  }

  typeByName(name: string): TypeInfo | undefined {
    const index = this.indexByName.get(name)
    return index === undefined ? undefined : this.reference.types[index]
  }

  /** Factor de un tipo de ataque contra un unico tipo defensor. */
  factor(attacking: string, defending: string): number {
    const row = this.indexByName.get(attacking)
    const column = this.indexByName.get(defending)
    if (row === undefined || column === undefined) return 1
    return this.reference.chart[row][column]
  }

  /**
   * Defensa: los tipos del defensor SI se multiplican entre si,
   * porque un mismo ataque los atraviesa a la vez. De ahi el x4 y el x0.25.
   */
  defensiveMultiplier(attacking: string, defenderTypes: readonly string[]): Multiplier {
    const product = defenderTypes.reduce((total, type) => total * this.factor(attacking, type), 1)
    return product as Multiplier
  }

  defensiveProfile(defenderTypes: readonly string[]): TypeEffect[] {
    return this.reference.types.map((type) => ({
      type,
      multiplier: this.defensiveMultiplier(type.name, defenderTypes),
    }))
  }

  /**
   * Ataque: NO se multiplican los tipos del atacante entre si.
   * Un Pokemon golpea con un movimiento de un solo tipo cada vez,
   * asi que cada tipo propio se evalua por separado.
   */
  offensiveProfile(attackingType: string): TypeEffect[] {
    return this.reference.types.map((type) => ({
      type,
      multiplier: this.factor(attackingType, type.name) as Multiplier,
    }))
  }

  /** Mejor multiplicador alcanzable con cualquiera de sus tipos: "a quien puede golpear fuerte". */
  bestCoverage(attackerTypes: readonly string[]): TypeEffect[] {
    return this.reference.types.map((type) => ({
      type,
      multiplier: Math.max(
        ...attackerTypes.map((attacking) => this.factor(attacking, type.name)),
      ) as Multiplier,
    }))
  }

  /** Agrupa un perfil por multiplicador, descartando los grupos vacios. */
  group(effects: TypeEffect[], order: Multiplier[]): EffectGroup[] {
    return order
      .map((multiplier) => ({
        multiplier,
        label: MULTIPLIER_LABEL[multiplier],
        types: effects
          .filter((effect) => effect.multiplier === multiplier)
          .map((effect) => effect.type),
      }))
      .filter((group) => group.types.length > 0)
  }
}
