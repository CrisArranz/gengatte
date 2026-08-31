import { STAT_LABEL_ES } from '@/data/schema'
import type { StatRange as Range } from '@/domain/stats'

interface StatRangeTableProps {
  ranges: Range[]
  total: number
}

/**
 * Rango minimo-maximo a nivel 100 por estadistica, con el valor neutro
 * (IV 31, EV 0, naturaleza 1.0) como referencia realista intermedia.
 */
export function StatRangeTable({ ranges, total }: StatRangeTableProps) {
  return (
    <table className="w-full text-sm">
      <caption className="sr-only">Estadísticas a nivel 100</caption>
      <thead>
        <tr className="text-left">
          <th scope="col">Estadística</th>
          <th scope="col" className="text-right">
            Base
          </th>
          <th scope="col" className="text-right">
            Mín.
          </th>
          <th scope="col" className="text-right">
            Neutro
          </th>
          <th scope="col" className="text-right">
            Máx.
          </th>
        </tr>
      </thead>
      <tbody>
        {ranges.map((range) => (
          <tr key={range.key}>
            <th scope="row" className="text-left font-normal">
              {STAT_LABEL_ES[range.key]}
            </th>
            <td className="text-right tabular-nums opacity-70">{range.base}</td>
            <td className="text-right tabular-nums">{range.min}</td>
            <td className="text-right tabular-nums">{range.neutral}</td>
            <td className="text-right tabular-nums">{range.max}</td>
          </tr>
        ))}
      </tbody>
      <tfoot>
        <tr>
          <th scope="row" className="text-left">
            Total base
          </th>
          <td className="text-right tabular-nums">{total}</td>
          <td colSpan={3} />
        </tr>
      </tfoot>
    </table>
  )
}
