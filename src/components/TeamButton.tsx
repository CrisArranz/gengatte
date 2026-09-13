import type { MouseEvent } from 'react'
import { useTeam } from '@/data/teamContext'
import { MAX_TEAM_SIZE } from '@/domain/team'

interface TeamButtonProps {
  pokemonId: number
  pokemonName: string
  variant?: 'full' | 'compact'
  className?: string
}

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

  const onClick = (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault()
    event.stopPropagation()
    if (inTeam) remove(pokemonId)
    else add(pokemonId)
  }

  if (variant === 'compact') {
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
        className={`flex h-7 w-7 items-center justify-center rounded-full border-2 border-current bg-white leading-none disabled:opacity-30 dark:bg-slate-950 ${className}`}
      >
        <span aria-hidden="true">{inTeam ? '✕' : '+'}</span>
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
      {inTeam ? 'Quitar del equipo' : isFull ? 'Equipo completo' : 'Añadir al equipo'}
    </button>
  )
}
