import { Link } from 'react-router'
import { TypeIcon } from '@/components/TypeIcon'
import type { Pokemon, TypeInfo } from '@/data/schema'
import { artworkUrl } from '@/data/sprites'
import { useTeam } from '@/data/teamContext'

/** Un hueco ocupado del equipo: ficha, quitar, y sus debilidades (x2/x4) propias. */
export function TeamSlotCard({
  pokemon,
  weaknesses,
}: {
  pokemon: Pokemon
  weaknesses: TypeInfo[]
}) {
  const { remove } = useTeam()

  return (
    <div className="relative flex flex-col items-center gap-2 border-2 border-current p-3 text-center">
      <button
        type="button"
        onClick={() => remove(pokemon.id)}
        aria-label={`Quitar a ${pokemon.nameEs} del equipo`}
        className="absolute top-1 right-1 flex h-6 w-6 items-center justify-center rounded-full border border-current/40 text-xs hover:bg-current/10"
      >
        <span aria-hidden="true">✕</span>
      </button>

      <Link to={`/pokemon/${pokemon.name}`} className="flex flex-col items-center gap-1">
        <img
          src={artworkUrl(pokemon.id)}
          alt={pokemon.nameEs}
          width={80}
          height={80}
          decoding="async"
          className="h-20 w-20 object-contain"
        />
        <span className="font-display text-sm tracking-wide uppercase">{pokemon.nameEs}</span>
      </Link>

      <div className="flex min-h-8 flex-wrap items-center justify-center gap-1">
        {weaknesses.length === 0 ? (
          <span className="text-xs opacity-60">Sin debilidades relevantes</span>
        ) : (
          weaknesses.map((type) => <TypeIcon key={type.id} type={type} small width={28} height={28} />)
        )}
      </div>
    </div>
  )
}
