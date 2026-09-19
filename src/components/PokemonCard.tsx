import { Link } from 'react-router'
import { TeamButton } from '@/components/TeamButton'
import type { Pokemon } from '@/data/schema'
import { spriteUrl } from '@/data/sprites'

interface PokemonCardProps {
  pokemon: Pokemon
}

/**
 * Tarjeta de resultado del boceto 1: imagen encuadrada y nombre en mayusculas.
 *
 * El boton de equipo va fuera del <Link>, como hermano suyo: un <button>
 * dentro de un <a> es un control interactivo anidado, asi que la tarjeta
 * deja de ser un unico enlace y pasa a ser un contenedor con dos.
 */
export function PokemonCard({ pokemon }: PokemonCardProps) {
  return (
    <div className="relative flex w-40 flex-col items-center gap-2 p-3 text-center transition-all duration-300">
      <TeamButton
        pokemonId={pokemon.id}
        pokemonName={pokemon.nameEs}
        variant="compact"
        className="absolute top-1 right-1 z-10"
      />
      <Link to={`/pokemon/${pokemon.name}`} className="flex flex-col items-center gap-2">
        <img
          crossOrigin="anonymous"
          src={spriteUrl(pokemon.id)}
          alt={pokemon.nameEs}
          width={96}
          height={96}
          loading="lazy"
          decoding="async"
          className="h-24 w-24 hover:scale-150 transition-transform duration-350"
        />
        <span className="font-display text-sm tracking-wide uppercase">{pokemon.nameEs}</span>
        <span className="text-xs opacity-60">Nº {pokemon.id}</span>
      </Link>
    </div>
  )
}
