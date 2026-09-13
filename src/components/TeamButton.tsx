import { useEffect, useRef, useState, type MouseEvent } from 'react'
import { useTeam } from '@/data/teamContext'
import { MAX_TEAM_SIZE } from '@/domain/team'

interface TeamButtonProps {
  pokemonId: number
  pokemonName: string
  variant?: 'full' | 'compact'
  className?: string
}

// Cuanto dura el check de confirmacion antes de asentarse en el estado normal.
const ADDED_FEEDBACK_MS = 500

/**
 * Añade o quita un Pokemon del equipo. La variante compacta es un botón
 * circular para las tarjetas del buscador, donde no cabe texto; ahí va
 * fuera del <Link> de la tarjeta para no anidar controles interactivos.
 */
export function TeamButton({
  pokemonId,
  pokemonName,
  variant = 'full',
  className = '',
}: TeamButtonProps) {
  const { has, add, remove, isFull } = useTeam()
  const inTeam = has(pokemonId)
  const disabled = !inTeam && isFull
  // Al añadir, el botón muestra un check un instante antes de pasar a "en el
  // equipo": confirma visualmente la acción sin depender del color.
  const [justAdded, setJustAdded] = useState(false)
  const timeoutRef = useRef<number | undefined>(undefined)

  useEffect(() => () => window.clearTimeout(timeoutRef.current), [])

  const onClick = (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault()
    event.stopPropagation()
    if (inTeam) {
      remove(pokemonId)
      return
    }
    add(pokemonId)
    if (variant === 'full') {
      setJustAdded(true)
      window.clearTimeout(timeoutRef.current)
      timeoutRef.current = window.setTimeout(() => setJustAdded(false), ADDED_FEEDBACK_MS)
    }
  }

  if (variant === 'compact') {
    // Icono de reposo y el que se revela al hacer hover, como un carrete que
    // sube un piso: fuera del equipo previsualiza el "+" -> "✓" de añadir; ya
    // dentro, el reposo es el "✓" y el hover previsualiza la "✕" de quitar.
    const [restIcon, hoverIcon] = inTeam ? ['✓', '✕'] : ['+', '✓']

    // El color acompaña al icono: verde para "añadido"/"añadir", rojo para
    // "quitar". En reposo solo se colorea si ya esta en el equipo; el "+"
    // se queda neutro para no competir con el resto de la tarjeta.
    const restColor = inTeam
      ? 'border-emerald-600 text-emerald-600 dark:border-emerald-400 dark:text-emerald-400'
      : 'border-current'
    const hoverColor = disabled
      ? ''
      : inTeam
        ? 'hover:border-red-600 hover:text-red-600 hover:bg-red-50 dark:hover:border-red-400 dark:hover:text-red-400 dark:hover:bg-red-950/40'
        : 'hover:border-emerald-600 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:border-emerald-400 dark:hover:text-emerald-400 dark:hover:bg-emerald-950/40'

    return (
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        aria-label={
          inTeam
            ? `Quitar a ${pokemonName} del equipo`
            : isFull
              ? `El equipo ya tiene ${MAX_TEAM_SIZE} Pokémon`
              : `Añadir a ${pokemonName} al equipo`
        }
        // box-content: el borde se dibuja fuera de los 24px de contenido, que
        // es justo la altura de cada fila (h-6) del carrete. Con box-border
        // (el valor por defecto) el borde le resta esos mismos px al hueco
        // visible y el icono queda descentrado, pegado hacia arriba.
        className={`group box-content flex h-6 w-6 items-start justify-center overflow-hidden rounded-full border-2 bg-white leading-none transition-colors active:scale-95 disabled:opacity-30 dark:bg-slate-950 ${restColor} ${hoverColor} ${className}`}
      >
        <span
          aria-hidden="true"
          className="flex flex-col transition-transform duration-400 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:-translate-y-6 motion-reduce:transition-none"
        >
          <span className="flex h-6 w-6 items-center justify-center">{restIcon}</span>
          <span className="flex h-6 w-6 items-center justify-center">{hoverIcon}</span>
        </span>
      </button>
    )
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`border-2 border-current px-3 py-1.5 text-sm hover:bg-current/10 disabled:opacity-40 disabled:hover:bg-transparent ${className}`}
    >
      {justAdded ? (
        <span className="team-added-check inline-block">Añadido ✓</span>
      ) : inTeam ? (
        'Quitar del equipo'
      ) : isFull ? (
        'Equipo completo'
      ) : (
        'Añadir al equipo'
      )}
    </button>
  )
}
