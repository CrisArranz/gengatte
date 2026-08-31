import { createContext, useContext } from 'react'
import { TypeChart } from '../domain/typeChart'
import type { Pokedex, Reference } from './schema'
import type { SearchEntry } from './search'

export interface Dataset {
  pokedex: Pokedex
  reference: Reference
  chart: TypeChart
  index: SearchEntry[]
}

export type DatasetState =
  { status: 'loading' } | { status: 'error'; message: string } | { status: 'ready'; data: Dataset }

export const PokedexContext = createContext<DatasetState>({ status: 'loading' })

export function useDatasetState(): DatasetState {
  return useContext(PokedexContext)
}

/**
 * Para los componentes que solo se montan cuando el dataset ya esta listo.
 * Falla ruidosamente si se usa antes de tiempo, en vez de devolver datos vacios.
 */
export function useDataset(): Dataset {
  const state = useContext(PokedexContext)
  if (state.status !== 'ready') {
    throw new Error('useDataset() usado antes de que el dataset estuviera cargado')
  }
  return state.data
}
