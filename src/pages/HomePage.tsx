import { useCallback, useEffect, useMemo, useState } from 'react'
import { PokemonCard } from '@/components/PokemonCard'
import { SearchBar } from '@/components/SearchBar'
import { useDataset } from '@/data/pokedexContext'
import { search } from '@/data/search'

const PAGE_SIZE = 10
const SCROLL_THRESHOLD_PX = 200

/** Boceto 1: buscador y rejilla de tarjetas de resultado. */
export function HomePage() {
  const { index, pokedex } = useDataset()
  const [query, setQuery] = useState('')
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)

  const isSearching = query.trim() !== ''
  const searchResults = useMemo(() => search(index, query), [index, query])
  const browseResults = useMemo(
    () => pokedex.pokemon.slice(0, visibleCount),
    [pokedex, visibleCount],
  )
  const results = isSearching ? searchResults : browseResults

  // Al limpiar la búsqueda, el listado navegable vuelve a empezar por los primeros 10.
  const handleQueryChange = useCallback((value: string) => {
    setQuery(value)
    if (value.trim() === '') setVisibleCount(PAGE_SIZE)
  }, [])

  // Scroll infinito: al hacer scroll hacia el final se cargan 10 más.
  useEffect(() => {
    if (isSearching) return
    if (visibleCount >= pokedex.pokemon.length) return

    function onScroll() {
      const { scrollTop, clientHeight, scrollHeight } = document.documentElement
      if (scrollTop + clientHeight >= scrollHeight - SCROLL_THRESHOLD_PX) {
        setVisibleCount((count) => Math.min(count + PAGE_SIZE, pokedex.pokemon.length))
      }
    }

    window.addEventListener('scroll', onScroll, { passive: true })

    // Si lo ya cargado no llena la pantalla, no hay nada que scrollear: se
    // comprueba una vez tras pintar (misma condición que onScroll, que ya
    // se cumple sola cuando no hay overflow) para seguir completando hasta
    // que haga falta scroll de verdad o no quede nada más por cargar.
    const raf = requestAnimationFrame(onScroll)

    return () => {
      window.removeEventListener('scroll', onScroll)
      cancelAnimationFrame(raf)
    }
  }, [isSearching, visibleCount, pokedex])

  return (
    <>
      <SearchBar value={query} onChange={handleQueryChange} resultCount={results.length} />

      <div className="mt-6 flex flex-wrap justify-center gap-4">
        {results.map((pokemon) => (
          <PokemonCard key={pokemon.id} pokemon={pokemon} />
        ))}
      </div>

      {isSearching && results.length === 0 && (
        <p className="mt-6 text-center opacity-70">Ningún Pokémon coincide con «{query}».</p>
      )}
    </>
  )
}
