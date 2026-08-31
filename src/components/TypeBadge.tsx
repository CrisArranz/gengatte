import type { TypeInfo } from '@/data/schema'
import { TypeIcon } from '@/components/TypeIcon'

interface TypeBadgeProps {
  type: TypeInfo
  withIcon?: boolean
  isSmall?: boolean
  dimensions?: { width: number; height: number }
}

export function TypeBadge({ type, withIcon = false, isSmall = false, dimensions }: TypeBadgeProps) {
  return (
    <span className="inline-flex items-center gap-2 py-0.5 text-xs">
      {withIcon && (
        <TypeIcon
          type={type}
          small={isSmall}
          width={dimensions?.width ?? 32}
          height={dimensions?.height ?? 14}
        />
      )}
    </span>
  )
}
