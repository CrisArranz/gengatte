import { useMemo, type ReactNode } from 'react'
import { Link, useParams } from 'react-router'
import { EffectivenessGrid } from '@/components/EffectivenessGrid'
import { NatureTips } from '@/components/NatureTips'
import { StatRangeTable } from '@/components/StatRange'
import { TypeBadge } from '@/components/TypeBadge'
import { useDataset } from '@/data/pokedexContext'
import { findByName } from '@/data/search'
import { artworkUrl } from '@/data/sprites'
import { suggestNatures } from '@/domain/nature'
import { classify } from '@/domain/role'
import { baseStatTotal, statRanges } from '@/domain/stats'
import { DEFENSIVE_ORDER, OFFENSIVE_ORDER } from '@/domain/typeChart'
import { capitalize } from '@/utils/texts.utils'

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="border-2 border-current p-4">
      <h2 className="font-display mb-3 text-lg uppercase">{title}</h2>
      {children}
    </section>
  )
}

/** Boceto 2: cabecera con la ilustracion y rejilla 2x2 de paneles. */
export function PokemonPage() {
  const { name = '' } = useParams()
  const { index, chart, pokedex, reference } = useDataset()

  const pokemon = useMemo(() => findByName(index, name), [index, name])

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
      perType: pokemon.types.map((type) => ({
        type: chart.typeByName(type),
        groups: chart.group(chart.offensiveProfile(type), OFFENSIVE_ORDER),
      })),
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
      <header className="flex flex-wrap items-center gap-6">
        <img
          src={artworkUrl(pokemon.id)}
          alt={pokemon.nameEs}
          width={192}
          height={192}
          decoding="async"
          className="h-48 w-48 object-contain"
        />
        <div>
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
        </div>
      </header>

      <div className="grid gap-4 md:grid-cols-2">
        <Panel title="Fortalezas">
          <div className="space-y-4">
            {analysis.perType.map(
              (entry) =>
                entry.type && (
                  <div key={entry.type.id}>
                    <h3 className="mb-2 text-sm uppercase opacity-70">
                      Movimientos de tipo {entry.type.nameEs}
                    </h3>
                    <EffectivenessGrid groups={entry.groups} />
                  </div>
                ),
            )}
          </div>
        </Panel>

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

        <Panel title="Tips">
          <NatureTips role={analysis.role} suggestions={analysis.natures} />
        </Panel>
      </div>
    </article>
  )
}
