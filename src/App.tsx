import { useMemo, useState } from 'react'
import { PokemonCard } from './components/PokemonCard'
import { SearchBar } from './components/SearchBar'
import { PokedexProvider } from './data/PokedexProvider'
import { useDatasetState } from './data/pokedexContext'
import { search } from './data/search'

/**
 * Fase 3: buscador funcional sobre el dataset local.
 * Las rutas y la ficha completa llegan en la fase 4 (PLAN.md, seccion 6).
 */
function Home() {
  const state = useDatasetState()
  const [query, setQuery] = useState('')

  const results = useMemo(
    () => (state.status === 'ready' ? search(state.data.index, query) : []),
    [state, query],
  )

  if (state.status === 'loading') return <p className="py-8 text-center">Cargando Pokédex…</p>
  if (state.status === 'error') {
    return (
      <p className="py-8 text-center" role="alert">
        No se pudo cargar la Pokédex: {state.message}
      </p>
    )
  }

  return (
    <>
      <SearchBar value={query} onChange={setQuery} resultCount={results.length} />

      <div className="mt-6 flex flex-wrap justify-center gap-4">
        {results.map((pokemon) => (
          <PokemonCard key={pokemon.id} pokemon={pokemon} />
        ))}
      </div>

      {query.trim() !== '' && results.length === 0 && (
        <p className="mt-6 text-center opacity-70">Ningún Pokémon coincide con «{query}».</p>
      )}
    </>
  )
}

export default function App() {
  return (
    <PokedexProvider>
      <main className="mx-auto max-w-4xl px-4 py-8">
        <h1 className="mb-6 text-center text-3xl font-normal tracking-wide">Gengatte</h1>
        <Home />
      </main>
    </PokedexProvider>
  )
}
