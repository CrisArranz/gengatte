import type { EffectGroup } from '../domain/typeChart'
import { TypeBadge } from './TypeBadge'

interface EffectivenessGridProps {
  groups: EffectGroup[]
  /** Texto para cuando no hay ningun grupo (por ejemplo, un tipo sin inmunidades). */
  emptyLabel?: string
}

/**
 * Lista de multiplicadores con los tipos que caen en cada uno.
 * El multiplicador va siempre como texto ("x4", "x½"), nunca solo como color:
 * asi se lee igual con daltonismo y en modo oscuro.
 */
export function EffectivenessGrid({ groups, emptyLabel }: EffectivenessGridProps) {
  if (groups.length === 0) {
    return <p className="text-sm opacity-70">{emptyLabel ?? 'Sin datos.'}</p>
  }

  return (
    <dl className="space-y-2">
      {groups.map((group) => (
        <div key={group.multiplier} className="flex flex-wrap items-baseline gap-2">
          <dt className="w-10 shrink-0 font-bold tabular-nums">{group.label}</dt>
          <dd className="flex flex-wrap gap-1">
            {group.types.map((type) => (
              <TypeBadge key={type.id} type={type} />
            ))}
          </dd>
        </div>
      ))}
    </dl>
  )
}
