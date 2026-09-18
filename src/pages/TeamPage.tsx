import { useMemo } from 'react'
import { Link } from 'react-router'
import { BenchSlotCard } from '@/components/BenchSlotCard'
import { Panel } from '@/components/Panel'
import { TeamSlotCard } from '@/components/TeamSlotCard'
import { TypeIcon } from '@/components/TypeIcon'
import { useDataset } from '@/data/pokedexContext'
import type { Pokemon } from '@/data/schema'
import { useTeam } from '@/data/teamContext'
import { BENCH_SIZE, MAX_TEAM_SIZE, memberWeaknesses, teamWeaknesses } from '@/domain/team'

function EmptySlot() {
  return (
    <Link
      to="/"
      className="flex min-h-44 flex-col items-center justify-center gap-1 border-2 border-dashed border-current/30 p-3 text-center text-sm opacity-60 hover:opacity-100"
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
      className="flex min-h-24 flex-col items-center justify-center gap-1 border-2 border-dashed border-current/30 p-2 text-center text-xs opacity-60 hover:opacity-100"
    >
      <span aria-hidden="true" className="text-lg leading-none">
        +
      </span>
      Añadir
    </Link>
  )
}

function toMembers(ids: number[], pokemon: Pokemon[]): Pokemon[] {
  return ids
    .map((id) => pokemon.find((candidate) => candidate.id === id))
    .filter((candidate): candidate is Pokemon => candidate !== undefined)
}

export function TeamPage() {
  const { chart, pokedex } = useDataset()
  const { ids, benchIds } = useTeam()

  // El orden de `ids`/`benchIds` es el orden en que se añadieron: se respeta en la rejilla.
  const members = useMemo(() => toMembers(ids, pokedex.pokemon), [ids, pokedex])
  const benchMembers = useMemo(() => toMembers(benchIds, pokedex.pokemon), [benchIds, pokedex])

  const weaknessesByMember = useMemo(
    () => new Map(members.map((pokemon) => [pokemon.id, memberWeaknesses(chart, pokemon.types)])),
    [members, chart],
  )

  // Las debilidades globales cuentan a titulares y banquillo: es el equipo completo de 10.
  const summary = useMemo(
    () => teamWeaknesses(chart, [...members, ...benchMembers].map((pokemon) => pokemon.types)),
    [members, benchMembers, chart],
  )

  const slots = Array.from({ length: MAX_TEAM_SIZE }, (_, index) => members[index])
  const benchSlots = Array.from({ length: BENCH_SIZE }, (_, index) => benchMembers[index])

  return (
    <div className="space-y-6">
      <header className="text-center">
        <h1 className="font-display text-3xl tracking-wide uppercase">Tu equipo</h1>
        <p className="opacity-70">
          {members.length} / {MAX_TEAM_SIZE} Pokémon
        </p>
      </header>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {slots.map((pokemon, index) =>
          pokemon ? (
            <TeamSlotCard
              key={pokemon.id}
              pokemon={pokemon}
              weaknesses={weaknessesByMember.get(pokemon.id) ?? []}
            />
          ) : (
            <EmptySlot key={`empty-${index}`} />
          ),
        )}
      </div>

      <section>
        <h2 className="font-display mb-3 text-center text-lg uppercase opacity-80">
          Banquillo · {benchMembers.length} / {BENCH_SIZE}
        </h2>
        <div className="grid grid-cols-4 gap-3">
          {benchSlots.map((pokemon, index) =>
            pokemon ? (
              <BenchSlotCard key={pokemon.id} pokemon={pokemon} />
            ) : (
              <EmptyBenchSlot key={`empty-bench-${index}`} />
            ),
          )}
        </div>
      </section>

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
    </div>
  )
}
