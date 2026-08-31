import { Fragment } from 'react'
import type { EffectGroup } from '../domain/typeChart'
import { TypeBadge } from './TypeBadge'

interface EffectivenessGridProps {
  groups: EffectGroup[]
  /** Texto para cuando no hay ningun grupo (por ejemplo, un tipo sin inmunidades). */
  emptyLabel?: string
}

/** Lado del icono de tipo. Los sprites "small" son cuadrados de 60x60. */
const CELL = 48

/**
 * Multiplicadores y los tipos que caen en cada uno.
 *
 * El multiplicador va siempre como texto ("x4", "x½"), nunca solo como color:
 * asi se lee igual con daltonismo y en modo oscuro.
 *
 * Dos rejillas anidadas, cada una porque el contenido lo es de verdad:
 *
 * - La exterior tiene dos columnas, `auto` para las etiquetas y `1fr` para los
 *   iconos. La columna de etiquetas se mide sola por la mas ancha de todas, asi
 *   que "x0,25" no descuadra nada y no hace falta fijarle un ancho a ojo.
 * - La interior reparte celdas de tamano fijo. Como todas las filas tienen el
 *   mismo ancho disponible, resuelven el mismo numero de columnas y los iconos
 *   quedan alineados tambien en vertical entre multiplicadores distintos, cosa
 *   que con flex no pasaba: cada fila se empaquetaba por su cuenta.
 */
export function EffectivenessGrid({ groups, emptyLabel }: EffectivenessGridProps) {
  if (groups.length === 0) {
    return <p className="text-sm opacity-70">{emptyLabel ?? 'Sin datos.'}</p>
  }

  return (
    <dl className="grid grid-cols-[auto_1fr] items-center gap-x-3 gap-y-2">
      {groups.map((group) => (
        <Fragment key={group.multiplier}>
          <dt className="font-bold tabular-nums">{group.label}</dt>
          <dd
            className="grid gap-1"
            style={{ gridTemplateColumns: `repeat(auto-fill, ${CELL}px)` }}
          >
            {group.types.map((type) => (
              <TypeBadge
                key={type.id}
                type={type}
                withIcon
                isSmall
                dimensions={{ width: CELL, height: CELL }}
              />
            ))}
          </dd>
        </Fragment>
      ))}
    </dl>
  )
}
