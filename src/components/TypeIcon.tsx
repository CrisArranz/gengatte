import type { TypeInfo } from '@/data/schema'
import { typeIconUrl } from '@/data/sprites'

interface TypeIconProps {
  type: TypeInfo
  width: number
  height: number
  /**
   * Variante circular de 60x60, sin texto dibujado dentro. La apaisada de
   * 200x40 ya lleva el nombre del tipo, asi que no necesita tooltip.
   */
  small?: boolean
  className?: string
  /** Muestra el tooltip sin raton encima: la columna enfocada de la tabla. */
  pinned?: boolean
}

/**
 * Icono de tipo con el nombre en un tooltip al pasar por encima.
 *
 * El globo es hermano de la imagen y no un ::after suyo: los pseudo-elementos
 * no se pintan en elementos reemplazados, asi que un <img> no puede llevarlos.
 * De ahi el <span> envolvente con `group` y `relative`.
 */
export function TypeIcon({
  type,
  width,
  height,
  small = false,
  className,
  pinned = false,
}: TypeIconProps) {
  return (
    <span className="group relative inline-flex justify-center">
      <img
        src={typeIconUrl(type.id, small)}
        // Sin aria-hidden: este alt es lo unico que anuncia el tipo, porque
        // el badge ya no pinta el nombre como texto.
        alt={type.nameEs}
        width={width}
        height={height}
        loading="lazy"
        decoding="async"
        // El zoom va en la imagen y no en el envoltorio: si escalara el
        // contenedor, el tooltip crecería y se desplazaría con ella.
        className={`object-contain ${small ? 'transition-transform group-hover:scale-125' : ''} ${className ?? ''}`}
      />

      {small && (
        <span
          // Oculto a los lectores de pantalla: el alt de la imagen ya dice
          // este mismo nombre, y si no se anunciaria dos veces.
          aria-hidden="true"
          className={`pointer-events-none absolute top-full left-1/2 z-30 mt-1 -translate-x-1/2 rounded-sm bg-slate-900 px-1.5 py-0.5 text-xs whitespace-nowrap text-white dark:bg-slate-100 dark:text-slate-900 ${
            pinned ? 'opacity-100' : 'opacity-0 transition-opacity group-hover:opacity-100'
          }`}
        >
          {type.nameEs}
        </span>
      )}
    </span>
  )
}
