import type { Pokemon } from '../data/schema'
import { spriteUrl } from '../data/sprites'

interface PokemonCardProps {
  pokemon: Pokemon
  onSelect?: (pokemon: Pokemon) => void
}

/** Tarjeta de resultado del boceto 1: imagen encuadrada y nombre en mayusculas. */
export function PokemonCard({ pokemon, onSelect }: PokemonCardProps) {
  return (
    <button
      type="button"
      onClick={() => onSelect?.(pokemon)}
      className="flex w-40 flex-col items-center gap-2 border-2 border-current p-3 text-center"
    >
      <img
        src={spriteUrl(pokemon.id)}
        alt={pokemon.nameEs}
        width={96}
        height={96}
        loading="lazy"
        decoding="async"
        className="h-24 w-24 border border-current object-contain"
      />
      <span className="text-sm tracking-wide uppercase">{pokemon.nameEs}</span>
      <span className="text-xs opacity-60">Nº {pokemon.id}</span>
    </button>
  )
}
