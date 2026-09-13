import { useMemo } from 'react'
import { Link, useParams } from 'react-router'
import { EffectivenessGrid } from '@/components/EffectivenessGrid'
import { NatureTips } from '@/components/NatureTips'
import { Panel } from '@/components/Panel'
import { StatRangeTable } from '@/components/StatRange'
import { TeamButton } from '@/components/TeamButton'
import { TypeBadge } from '@/components/TypeBadge'
import type { Pokemon } from '@/data/schema'
import { useDataset } from '@/data/pokedexContext'
import { findByName } from '@/data/search'
import { artworkUrl } from '@/data/sprites'
import { suggestNatures } from '@/domain/nature'
import { classify } from '@/domain/role'
import { baseStatTotal, statRanges } from '@/domain/stats'
import { DEFENSIVE_ORDER, OFFENSIVE_ORDER } from '@/domain/typeChart'
import { capitalize } from '@/utils/texts.utils'

/**
 * Miniatura de un Pokemon vecino (anterior/siguiente en la Pokedex). El
 * nombre solo aparece al pasar el raton o el foco, como una tooltip.
 */
function NeighborLink({
  pokemon,
  direction,
}: {
  pokemon: Pokemon
  direction: 'previous' | 'next'
}) {
  const label = capitalize(pokemon.name)

  return (
    <Link
      to={`/pokemon/${pokemon.name}`}
      className="group relative flex items-center gap-1 p-1 opacity-70 hover:opacity-100"
      aria-label={`${direction === 'previous' ? 'Pokémon anterior' : 'Pokémon siguiente'}: ${label}`}
    >
      {direction === 'previous' && <span aria-hidden="true">←</span>}
      <img
        src={artworkUrl(pokemon.id)}
        alt=""
        width={40}
        height={40}
        decoding="async"
        className="h-10 w-10 object-contain"
      />
      {direction === 'next' && <span aria-hidden="true">→</span>}
      <span
        className={[
          'pointer-events-none absolute top-full z-10 mt-1 rounded border border-current/25',
          'bg-white px-2 py-1 text-xs whitespace-nowrap opacity-0 dark:bg-slate-950',
          'transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100',
          direction === 'previous' ? 'left-0' : 'right-0',
        ].join(' ')}
      >
        {label}
      </span>
    </Link>
  )
}

/** Boceto 2: cabecera con la ilustracion y rejilla 2x2 de paneles. */
export function PokemonPage() {
  const { name = '' } = useParams()
  const { index, chart, pokedex, reference } = useDataset()

  const pokemon = useMemo(() => findByName(index, name), [index, name])

  // pokedex.pokemon ya viene ordenado por numero de Pokedex.
  const { previous, next } = useMemo(() => {
    if (!pokemon) return { previous: undefined, next: undefined }
    const position = pokedex.pokemon.findIndex((entry) => entry.id === pokemon.id)
    return {
      previous: position > 0 ? pokedex.pokemon[position - 1] : undefined,
      next: position < pokedex.pokemon.length - 1 ? pokedex.pokemon[position + 1] : undefined,
    }
  }, [pokemon, pokedex])

  // Todo el calculo depende solo del Pokemon: se memoiza junto.
  const analysis = useMemo(() => {
    if (!pokemon) return null
    const types = pokemon.types
      .map((type) => chart.typeByName(type))
      .filter((type) => type !== undefined)

    return {
      types,
      defense: chart.group(chart.defensiveProfile(pokemon.types), DEFENSIVE_ORDER),
      coverage: chart.group(chart.bestCoverage(pokemon.types), OFFENSIVE_ORDER),
      ranges: statRanges(pokemon),
      total: baseStatTotal(pokemon),
      role: classify(pokemon, pokedex.percentiles),
      natures: suggestNatures(pokemon, reference.natures, pokedex.percentiles),
    }
  }, [pokemon, chart, pokedex, reference])

  if (!pokemon || !analysis) {
    return (
      <div className="py-8 text-center">
        <p>No hay ningún Pokémon llamado «{name}».</p>
        <Link to="/" className="underline underline-offset-4">
          Volver al buscador
        </Link>
      </div>
    )
  }

  return (
    <article className="space-y-6">
      <nav className="flex items-center justify-between gap-4">
        <Link to="/" className="flex items-center gap-1 text-sm opacity-70 hover:opacity-100">
          <span aria-hidden="true">←</span> Volver
        </Link>

        <div className="flex items-center gap-2">
          {previous && <NeighborLink pokemon={previous} direction="previous" />}
          {next && <NeighborLink pokemon={next} direction="next" />}
        </div>
      </nav>

      <header className="flex flex-wrap items-center justify-center gap-6">
        <img
          src={artworkUrl(pokemon.id)}
          alt={pokemon.nameEs}
          width={192}
          height={192}
          decoding="async"
          className="h-58 w-58 sm:w-48 sm:h-48 object-contain"
        />
        <div className="flex flex-col items-center gap-1 text-center">
          <p className="text-sm opacity-60">Nº {pokemon.id}</p>
          <h1 className="font-display text-3xl tracking-wide uppercase">{pokemon.nameEs}</h1>
          <p className="opacity-70">
            {capitalize(pokemon.name)} · {pokemon.genus}
          </p>
          <ul className="mt-2 flex gap-2">
            {analysis.types.map((type) => (
              <li key={type.id}>
                <TypeBadge type={type} withIcon dimensions={{ width: 128, height: 48 }} />
              </li>
            ))}
          </ul>
          <TeamButton
            pokemonId={pokemon.id}
            pokemonName={pokemon.nameEs}
            className="mt-2"
          />
        </div>
      </header>

      <div className="grid gap-4 md:grid-cols-2">
        <Panel title="Debilidades">
          <EffectivenessGrid groups={analysis.defense} />
        </Panel>

        <Panel title="Estadísticas a nivel 100">
          <StatRangeTable ranges={analysis.ranges} total={analysis.total} />
          <p className="mt-3 text-xs opacity-70">
            Mín.: IV 0, EV 0 y naturaleza perjudicial. Neutro: IV 31, EV 0 y naturaleza neutra.
            Máx.: IV 31, EV 252 y naturaleza beneficiosa.
          </p>
        </Panel>

        <Panel title="Tips" className="md:col-span-2">
          <NatureTips role={analysis.role} suggestions={analysis.natures} />
        </Panel>
      </div>
    </article>
  )
}
