import { useEffect, useState, type ReactNode } from 'react'
import { TypeChart } from '../domain/typeChart'
import { DATA_MANIFEST } from './manifest'
import { PokedexContext, type DatasetState } from './pokedexContext'
import type { Pokedex, Reference } from './schema'
import { buildIndex } from './search'

async function loadJson<T>(url: string, signal: AbortSignal): Promise<T> {
  const response = await fetch(url, { signal })
  if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`)
  return (await response.json()) as T
}

/**
 * Descarga el dataset una sola vez al arrancar la aplicacion.
 * A partir de ahi todo se resuelve en memoria: ni una peticion mas.
 */
export function PokedexProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<DatasetState>({ status: 'loading' })

  useEffect(() => {
    const controller = new AbortController()

    Promise.all([
      loadJson<Pokedex>(DATA_MANIFEST.pokedex, controller.signal),
      loadJson<Reference>(DATA_MANIFEST.reference, controller.signal),
    ])
      .then(([pokedex, reference]) => {
        setState({
          status: 'ready',
          data: {
            pokedex,
            reference,
            chart: new TypeChart(reference),
            index: buildIndex(pokedex.pokemon),
          },
        })
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return
        setState({
          status: 'error',
          message: error instanceof Error ? error.message : 'Error desconocido',
        })
      })

    return () => controller.abort()
  }, [])

  return <PokedexContext value={state}>{children}</PokedexContext>
}
