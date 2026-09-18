import type { Ref } from 'react'
import type { Pokemon } from '@/data/schema'
import { artworkUrl, spriteUrl } from '@/data/sprites'

interface TeamShareCardProps {
  /** Huecos titulares en orden, `undefined` si están vacíos. */
  team: (Pokemon | undefined)[]
  /** Huecos de banquillo en orden, `undefined` si están vacíos. */
  bench: (Pokemon | undefined)[]
  ref: Ref<HTMLDivElement>
}

/**
 * Composición pensada solo para exportarse como imagen (el botón de
 * descarga la captura con html-to-image): colores fijos, no ligados al
 * tema claro/oscuro de la app, para que la imagen se vea igual sin
 * importar qué tema tenga activo quien la genera.
 */
export function TeamShareCard({ team, bench, ref }: TeamShareCardProps) {
  return (
    <div ref={ref} className="w-[720px] bg-white p-8 text-slate-900">
      <h2 className="font-display mb-6 text-center text-2xl tracking-wide uppercase">
        Mi equipo Gengatte
      </h2>

      <div className="mb-8 grid grid-cols-3 gap-4">
        {team.map((pokemon, index) => (
          <div
            key={index}
            className="flex flex-col items-center gap-1 border-2 border-slate-900 p-3"
          >
            {pokemon ? (
              <>
                <img
                  crossOrigin="anonymous"
                  src={artworkUrl(pokemon.id)}
                  alt={pokemon.nameEs}
                  width={112}
                  height={112}
                  className="h-28 w-28 object-contain"
                />
                <span className="font-display text-sm tracking-wide uppercase">
                  {pokemon.nameEs}
                </span>
              </>
            ) : (
              <div className="flex h-28 w-28 items-center justify-center text-xs text-slate-400">
                Vacío
              </div>
            )}
          </div>
        ))}
      </div>

      <h3 className="mb-3 text-center text-sm font-bold tracking-wide uppercase opacity-70">
        Banquillo
      </h3>
      <div className="grid grid-cols-4 gap-3">
        {bench.map((pokemon, index) => (
          <div
            key={index}
            className="flex flex-col items-center gap-1 border-2 border-slate-900/60 p-2"
          >
            {pokemon ? (
              <>
                <img
                  crossOrigin="anonymous"
                  src={spriteUrl(pokemon.id)}
                  alt={pokemon.nameEs}
                  width={64}
                  height={64}
                  className="h-16 w-16 object-contain"
                />
                <span className="font-display text-xs tracking-wide uppercase">
                  {pokemon.nameEs}
                </span>
              </>
            ) : (
              <div className="flex h-16 w-16 items-center justify-center text-[10px] text-slate-400">
                Vacío
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
