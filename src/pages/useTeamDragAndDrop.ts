import {
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import { useEffect, useRef } from 'react'
import { useTeam, type SlotGroup, type SlotRef } from '@/data/teamContext'

function parseSlotId(id: string): SlotRef {
  const [group, index] = id.split(':')
  return { group: group as SlotGroup, index: Number(index) }
}

/**
 * Sensores y manejadores de arrastrar y soltar para reordenar equipo y
 * banquillo, incluida la supresión del click fantasma: al soltar un
 * arrastre sobre un hueco (un <Link>), el navegador dispara igualmente un
 * click tras el drop, que navegaría a la ficha del Pokemon en vez de
 * quedarse en la página con el intercambio hecho. dnd-kit intenta frenar
 * ese click el mismo con un listener propio, pero solo detiene la
 * propagación sin cancelar la navegación por defecto del enlace: hace
 * falta un listener propio en window, registrado desde el montaje (antes
 * de que exista el de dnd-kit) para llegar a tiempo de cancelarla.
 */
export function useTeamDragAndDrop() {
  const { move } = useTeam()

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
  )

  const suppressClickRef = useRef(false)

  useEffect(() => {
    function suppressGhostClick(event: MouseEvent) {
      if (suppressClickRef.current) {
        event.preventDefault()
        event.stopPropagation()
      }
    }
    window.addEventListener('click', suppressGhostClick, true)
    return () => window.removeEventListener('click', suppressGhostClick, true)
  }, [])

  function handleDragStart() {
    suppressClickRef.current = true
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (over && active.id !== over.id) {
      move(parseSlotId(String(active.id)), parseSlotId(String(over.id)))
    }
    // Un tick despues del drop, para tragarse el click fantasma que dispara
    // el navegador sobre el elemento bajo el cursor al soltar.
    requestAnimationFrame(() => {
      suppressClickRef.current = false
    })
  }

  return { sensors, handleDragStart, handleDragEnd }
}
