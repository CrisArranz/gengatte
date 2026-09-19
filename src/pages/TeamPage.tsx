import { DndContext } from '@dnd-kit/core'
import { useMemo } from 'react'
import { Link } from 'react-router'
import { BenchSlotCard } from '@/components/BenchSlotCard'
import { Panel } from '@/components/Panel'
import { TeamDragSlot } from '@/components/TeamDragSlot'
import { TeamShareCard } from '@/components/TeamShareCard'
import { TeamSlotCard } from '@/components/TeamSlotCard'
import { TypeIcon } from '@/components/TypeIcon'
import { useDataset } from '@/data/pokedexContext'
import type { Pokemon } from '@/data/schema'
import { useTeam } from '@/data/teamContext'
import { BENCH_SIZE, MAX_TEAM_SIZE, memberWeaknesses, teamWeaknesses } from '@/domain/team'
import { useTeamDragAndDrop } from '@/pages/useTeamDragAndDrop'
import { useTeamImageShare, type ShareButtonState } from '@/pages/useTeamImageShare'

const SHARE_BUTTON_LABELS: Record<ShareButtonState, string> = {
  sharing: 'Copiando…',
  retry: 'Reintentar',
  ready: 'Copiar imagen del equipo',
  preparing: 'Preparando imagen…',
}

function EmptySlot() {
  return (
    <Link
      to="/"
      className="flex h-full min-h-44 flex-col items-center justify-center gap-1 border-2 border-dashed border-current/30 p-3 text-center text-sm opacity-60 hover:opacity-100"
    >
      <span aria-hidden="true" className="text-2xl leading-none">
        +
      </span>
      Añadir Pokémon
    </Link>
  )
}

function EmptyBenchSlot() {
  return (
    <Link
      to="/"
      className="flex h-full min-h-24 flex-col items-center justify-center gap-1 border-2 border-dashed border-current/30 p-2 text-center text-xs opacity-60 hover:opacity-100"
    >
      <span aria-hidden="true" className="text-lg leading-none">
        +
      </span>
      Añadir
    </Link>
  )
}

function findPokemon(id: number | null, pokemon: Pokemon[]): Pokemon | undefined {
  if (id === null) return undefined
  return pokemon.find((candidate) => candidate.id === id)
}

export function TeamPage() {
  const { chart, pokedex } = useDataset()
  const { team, bench } = useTeam()
  const { sensors, handleDragStart, handleDragEnd } = useTeamDragAndDrop()

  const members = useMemo(
    () => team.map((id) => findPokemon(id, pokedex.pokemon)).filter((p): p is Pokemon => !!p),
    [team, pokedex],
  )
  const benchMembers = useMemo(
    () => bench.map((id) => findPokemon(id, pokedex.pokemon)).filter((p): p is Pokemon => !!p),
    [bench, pokedex],
  )

  const teamForShare = useMemo(
    () => team.map((id) => findPokemon(id, pokedex.pokemon)),
    [team, pokedex],
  )
  const benchForShare = useMemo(
    () => bench.map((id) => findPokemon(id, pokedex.pokemon)),
    [bench, pokedex],
  )
  const {
    shareCardRef,
    buttonState,
    onButtonClick: handleShare,
    prepareError,
    shareStatus,
    shareError,
    toastPhase,
  } = useTeamImageShare(teamForShare, benchForShare)

  const weaknessesByMember = useMemo(
    () => new Map(members.map((pokemon) => [pokemon.id, memberWeaknesses(chart, pokemon.types)])),
    [members, chart],
  )

  // Las debilidades globales cuentan a titulares y banquillo: es el equipo completo de 10.
  const summary = useMemo(
    () => teamWeaknesses(chart, [...members, ...benchMembers].map((pokemon) => pokemon.types)),
    [members, benchMembers, chart],
  )

  return (
    <div className="space-y-6">
      <header className="text-center">
        <h1 className="font-display text-3xl tracking-wide uppercase">Tu equipo</h1>
        <p className="opacity-70">
          {members.length} / {MAX_TEAM_SIZE} Pokémon
        </p>
        <p className="mt-1 text-xs opacity-60">
          Arrastra una ficha a otro hueco para reordenar el equipo o el banquillo.
        </p>
        <button
          type="button"
          onClick={handleShare}
          disabled={buttonState === 'sharing' || buttonState === 'preparing'}
          className="mt-3 border-2 border-current px-3 py-1.5 text-sm hover:bg-current/10 disabled:opacity-40"
        >
          {SHARE_BUTTON_LABELS[buttonState]}
        </button>
        {prepareError && (
          <p className="mt-1 text-xs text-red-500">
            No se pudo generar la imagen del equipo.
            <span className="block opacity-70">{prepareError}</span>
          </p>
        )}
        {shareStatus === 'downloaded' && (
          <p className="mt-1 text-xs opacity-70">Imagen descargada.</p>
        )}
        {shareStatus === 'error' && (
          <p className="mt-1 text-xs text-red-500">
            No se pudo generar la imagen. Inténtalo de nuevo.
            {shareError && <span className="block opacity-70">{shareError}</span>}
          </p>
        )}
      </header>

      {/*
        Fuera de pantalla pero en el DOM: html-to-image necesita el nodo
        renderizado (con las imagenes reales cargando) para poder capturarlo.
        Con colores fijos y sin controles, para que la imagen descargada solo
        muestre a los 10 Pokemon, sin las debilidades ni la interfaz.
      */}
      <div aria-hidden="true" className="fixed top-0 left-[-9999px]">
        <TeamShareCard ref={shareCardRef} team={teamForShare} bench={benchForShare} />
      </div>

      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          {team.map((id, index) => {
            const pokemon = findPokemon(id, pokedex.pokemon)
            return (
              <TeamDragSlot key={`team-${index}`} id={`team:${index}`} draggable={!!pokemon}>
                {pokemon ? (
                  <TeamSlotCard
                    pokemon={pokemon}
                    weaknesses={weaknessesByMember.get(pokemon.id) ?? []}
                  />
                ) : (
                  <EmptySlot />
                )}
              </TeamDragSlot>
            )
          })}
        </div>

        <section>
          <h2 className="font-display mb-3 text-center text-lg uppercase opacity-80">
            Banquillo · {benchMembers.length} / {BENCH_SIZE}
          </h2>
          <div className="grid grid-cols-4 gap-3">
            {bench.map((id, index) => {
              const pokemon = findPokemon(id, pokedex.pokemon)
              return (
                <TeamDragSlot key={`bench-${index}`} id={`bench:${index}`} draggable={!!pokemon}>
                  {pokemon ? <BenchSlotCard pokemon={pokemon} /> : <EmptyBenchSlot />}
                </TeamDragSlot>
              )
            })}
          </div>
        </section>
      </DndContext>

      <Panel title="Debilidades del equipo">
        {members.length === 0 && benchMembers.length === 0 ? (
          <p className="text-sm opacity-70">Añade Pokémon al equipo para ver sus debilidades combinadas.</p>
        ) : summary.length === 0 ? (
          <p className="text-sm opacity-70">Este equipo no tiene debilidades compartidas relevantes.</p>
        ) : (
          <>
            <ul className="flex flex-wrap gap-4">
              {summary.map(({ type, count }) => (
                <li key={type.id} className="flex flex-col items-center gap-1">
                  <TypeIcon type={type} small width={40} height={40} />
                  <span className="text-xs font-bold tabular-nums">×{count}</span>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-xs opacity-70">
              ×N: número de Pokémon del equipo débiles (x2 o x4) a ese tipo. No se suman los
              multiplicadores individuales, solo se cuentan las debilidades.
            </p>
          </>
        )}
      </Panel>

      {toastPhase !== 'hidden' && (
        <div
          role="status"
          className={`fixed bottom-4 left-1/2 -translate-x-1/2 rounded-md border-2 border-green-600 bg-green-300 px-4 py-2 text-sm text-black shadow-lg transition-all duration-500 ease-out ${
            toastPhase === 'visible' ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
          }`}
        >
          Imagen copiada
        </div>
      )}
    </div>
  )
}
