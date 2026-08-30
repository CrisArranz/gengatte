import type { Pokemon } from './schema'

/**
 * Busqueda local sobre el indice ya descargado: sin red, sin latencia.
 * Tolera acentos, mayusculas y guiones, y acepta nombre en espanol,
 * en ingles o numero de Pokedex.
 */

export function normalize(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Marcas diacriticas fuera antes de comparar.
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '') // "Nidoran-m", "Mr. Mime" y "Ho-Oh" se buscan sin signos.
}

export interface SearchEntry {
  pokemon: Pokemon
  es: string
  en: string
}

export function buildIndex(pokemon: readonly Pokemon[]): SearchEntry[] {
  return pokemon.map((entry) => ({
    pokemon: entry,
    es: normalize(entry.nameEs),
    en: normalize(entry.name),
  }))
}

/** Menor es mejor. `null` descarta la entrada. */
function scoreOf(entry: SearchEntry, query: string): number | null {
  if (entry.es === query || entry.en === query) return 0
  if (entry.es.startsWith(query) || entry.en.startsWith(query)) return 1
  if (entry.es.includes(query) || entry.en.includes(query)) return 2
  return null
}

export function search(index: readonly SearchEntry[], rawQuery: string, limit = 12): Pokemon[] {
  const query = normalize(rawQuery)
  if (query.length === 0) return []

  // Consulta numerica: es un numero de Pokedex, no un nombre.
  if (/^\d+$/.test(query)) {
    const id = Number(query)
    const exact = index.find((entry) => entry.pokemon.id === id)
    const partial = index.filter(
      (entry) => entry.pokemon.id !== id && String(entry.pokemon.id).startsWith(query),
    )
    return [...(exact ? [exact] : []), ...partial].slice(0, limit).map((entry) => entry.pokemon)
  }

  const matches: { pokemon: Pokemon; score: number }[] = []
  for (const entry of index) {
    const score = scoreOf(entry, query)
    if (score !== null) matches.push({ pokemon: entry.pokemon, score })
  }

  // A igual calidad de coincidencia, manda el numero de Pokedex.
  matches.sort((a, b) => a.score - b.score || a.pokemon.id - b.pokemon.id)
  return matches.slice(0, limit).map((match) => match.pokemon)
}

export function findByName(index: readonly SearchEntry[], rawName: string): Pokemon | undefined {
  const name = normalize(rawName)
  return index.find((entry) => entry.en === name || entry.es === name)?.pokemon
}
