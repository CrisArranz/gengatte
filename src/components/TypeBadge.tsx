import { typeIconUrl } from '../data/sprites'
import type { TypeInfo } from '../data/schema'

interface TypeBadgeProps {
  type: TypeInfo
  /** El icono es decorativo: el nombre del tipo ya va como texto al lado. */
  withIcon?: boolean
}

export function TypeBadge({ type, withIcon = false }: TypeBadgeProps) {
  return (
    <span className="inline-flex items-center gap-1 border border-current px-2 py-0.5 text-xs uppercase">
      {withIcon && (
        <img
          src={typeIconUrl(type.id)}
          alt=""
          width={32}
          height={14}
          loading="lazy"
          decoding="async"
          className="h-3.5 w-8 object-contain"
        />
      )}
      {type.nameEs}
    </span>
  )
}
