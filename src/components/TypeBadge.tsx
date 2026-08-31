import { typeIconUrl } from '../data/sprites'
import type { TypeInfo } from '../data/schema'

interface TypeBadgeProps {
  type: TypeInfo
  withIcon?: boolean
  isSmall?: boolean
  dimensions?: { width: number; height: number }
}

export function TypeBadge({ type, withIcon = false, isSmall = false, dimensions }: TypeBadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-2 py-0.5 text-xs ${isSmall && 'hover:scale-125 transition-transform'}`}
    >
      {withIcon && (
        <img
          src={typeIconUrl(type.id, isSmall)}
          alt={type.nameEs}
          aria-label={type.nameEs}
          width={dimensions?.width ?? 32}
          height={dimensions?.height ?? 14}
          loading="lazy"
          decoding="async"
          className="object-contain"
        />
      )}
    </span>
  )
}
