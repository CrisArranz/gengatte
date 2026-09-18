import { useDraggable, useDroppable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import type { ReactNode } from 'react'

interface TeamDragSlotProps {
  /** Identificador del hueco, tipo "team:0" o "bench:2". */
  id: string
  /** Solo los huecos ocupados se pueden arrastrar; los vacíos solo reciben. */
  draggable: boolean
  children: ReactNode
}

/**
 * Hace de un hueco del equipo/banquillo, a la vez, origen y destino de drag
 * and drop. dnd-kit no trae un hook combinado, así que se juntan a mano
 * useDraggable (para levantar la ficha) y useDroppable (para soltar encima).
 */
export function TeamDragSlot({ id, draggable, children }: TeamDragSlotProps) {
  const {
    attributes,
    listeners,
    setNodeRef: setDragRef,
    transform,
    isDragging,
  } = useDraggable({ id, disabled: !draggable })
  const { setNodeRef: setDropRef, isOver } = useDroppable({ id })

  return (
    <div
      ref={(node) => {
        setDragRef(node)
        setDropRef(node)
      }}
      style={{ transform: CSS.Translate.toString(transform) }}
      className={`touch-none transition-opacity ${isDragging ? 'z-10 opacity-40' : ''} ${
        isOver ? 'outline-2 outline-dashed outline-current outline-offset-2' : ''
      }`}
      {...(draggable ? { ...attributes, ...listeners } : {})}
    >
      {children}
    </div>
  )
}
