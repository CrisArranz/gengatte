import { useState } from 'react'
import { useDataset } from '@/data/pokedexContext'
import { TypeIcon } from '@/components/TypeIcon'

/** Simbolo y texto accesible de cada factor. Nunca solo color (PLAN.md 6.3). */
function cellFor(factor: number): { symbol: string; label: string } {
  if (factor === 0) return { symbol: '0', label: 'inmune' }
  if (factor === 0.5) return { symbol: '½', label: 'x0,5' }
  if (factor === 2) return { symbol: '2', label: 'x2' }
  return { symbol: '·', label: 'x1' }
}

/** Boceto 3: matriz 18x18 con cabeceras fijas y resaltado de fila y columna. */
export function TypeChartPage() {
  const { chart } = useDataset()
  const types = chart.types
  const [focus, setFocus] = useState<{ row: number; column: number } | null>(null)

  return (
    <section className="space-y-4">
      <h1 className="font-display text-2xl uppercase">Tabla de tipos</h1>
      <p className="text-sm opacity-70">
        Las filas son el tipo del ataque y las columnas el tipo del Pokémon que lo recibe. En un
        Pokémon de doble tipo se multiplican los dos valores: de ahí salen el x4 y el x0,25.
      </p>

      {/* 18 columnas no caben en 360 px: el desplazamiento horizontal es imprescindible. */}
      <div className="overflow-x-none">
        <table className="border-collapse text-center text-xs">
          <caption className="mb-2 text-left text-sm">
            ← Pokémon oponente → (columnas) · Tipo de ataque ↓ (filas)
          </caption>
          <thead>
            <tr>
              <th
                scope="col"
                className="sticky left-0 z-20 bg-inherit p-1 text-left dark:bg-inherit"
              >
                <span className="sr-only">Tipo de ataque</span>
              </th>
              {types.map((type, column) => (
                <th
                  key={type.id}
                  scope="col"
                  className={`p-1 ${focus?.column === column ? 'underline underline-offset-4' : ''}`}
                >
                  {/* Con la columna enfocada el tooltip se queda fijo, para que
                      quien navega con el teclado tambien sepa en cual esta. */}
                  <TypeIcon
                    type={type}
                    small
                    width={36}
                    height={36}
                    className="h-9 w-9"
                    pinned={focus?.column === column}
                  />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {types.map((attacking, row) => (
              <tr key={attacking.id}>
                <th
                  scope="row"
                  className={`sticky left-0 z-10 border border-current bg-white p-1 text-right whitespace-nowrap dark:bg-slate-950 ${
                    focus?.row === row ? 'underline underline-offset-4' : ''
                  }`}
                >
                  {attacking.nameEs}
                </th>
                {types.map((defending, column) => {
                  const factor = chart.factor(attacking.name, defending.name)
                  const cell = cellFor(factor)
                  const highlighted = focus?.row === row || focus?.column === column

                  return (
                    <td
                      key={defending.id}
                      tabIndex={0}
                      onMouseEnter={() => setFocus({ row, column })}
                      onFocus={() => setFocus({ row, column })}
                      onMouseLeave={() => setFocus(null)}
                      onBlur={() => setFocus(null)}
                      className={`border border-current p-1 ${highlighted ? 'bg-blue-100 dark:bg-blue-900' : ''}`}
                    >
                      <span aria-hidden="true">{cell.symbol}</span>
                      <span className="sr-only">
                        {attacking.nameEs} contra {defending.nameEs}: {cell.label}
                      </span>
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="flex flex-wrap gap-4 text-sm">
        <li className="font-display">2 = Súper efectivo (x2)</li>
        <li className="font-display">· = Neutro (x1)</li>
        <li className="font-display">½ = Poco efectivo (x0,5)</li>
        <li className="font-display">0 = Inmune</li>
      </ul>
    </section>
  )
}
