import { STAT_LABEL_ES } from '@/data/schema'
import type { NatureSuggestion } from '@/domain/nature'
import { NATURE_DISCLAIMER } from '@/domain/nature'
import type { Role } from '@/domain/role'

interface NatureTipsProps {
  role: Role
  suggestions: NatureSuggestion[]
}

/** Panel "tips" del boceto 2: rol del Pokemon y naturalezas recomendadas. */
export function NatureTips({ role, suggestions }: NatureTipsProps) {
  return (
    <div className="space-y-4 text-sm">
      <div>
        <ul className="flex flex-wrap gap-1">
          {role.tags.map((tag) => (
            <li key={tag} className="border border-current px-2 py-0.5 text-xs uppercase">
              {tag}
            </li>
          ))}
        </ul>
        <p className="mt-2">{role.summary}</p>
      </div>

      <h3 className="text-lg font-display uppercase">Naturalezas recomendadas</h3>
      <ul className="space-y-3">
        {suggestions.map((suggestion) => (
          <li key={suggestion.nature.id}>
            <p>
              <strong>{suggestion.nature.nameEs}</strong>{' '}
              <span className="opacity-70">({suggestion.nature.name})</span>
            </p>
            <p className="tabular-nums">
              +10 % {STAT_LABEL_ES[suggestion.up].toLowerCase()} → {suggestion.upValue} · −10 %{' '}
              {STAT_LABEL_ES[suggestion.down].toLowerCase()} → {suggestion.downValue}
            </p>
            <p className="opacity-80">{suggestion.reason}</p>
          </li>
        ))}
      </ul>

      <p className="text-xs opacity-70">{NATURE_DISCLAIMER}</p>
    </div>
  )
}
