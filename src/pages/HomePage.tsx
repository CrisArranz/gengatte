import { useMemo, useState } from 'react'
import { PokemonCard } from '../components/PokemonCard'
import { SearchBar } from '../components/SearchBar'
import { useDataset } from '../data/pokedexContext'
import { search } from '../data/search'

/** Boceto 1: buscador y rejilla de tarjetas de resultado. */
export function HomePage() {
  const { index } = useDataset()
  const [query, setQuery] = useState('')

  const results = useMemo(() => search(index, query), [index, query])

  return (
    <>
      <SearchBar value={query} onChange={setQuery} resultCount={results.length} />

      <div className="mt-6 flex flex-wrap justify-center gap-4">
        {results.map((pokemon) => (
          <PokemonCard key={pokemon.id} pokemon={pokemon} />
        ))}
      </div>

      {query.trim() === '' && (
        <p className="mt-6 text-center opacity-70">
          Escribe un nombre en español o inglés, o un número de Pokédex.
        </p>
      )}

      {query.trim() !== '' && results.length === 0 && (
        <p className="mt-6 text-center opacity-70">Ningún Pokémon coincide con «{query}».</p>
      )}
    </>
  )
}
