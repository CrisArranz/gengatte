import { useId, type ChangeEvent } from 'react'

interface SearchBarProps {
  value: string
  onChange: (value: string) => void
  resultCount: number
}

/** Buscador del boceto 1: campo ancho con la lupa a la derecha. */
export function SearchBar({ value, onChange, resultCount }: SearchBarProps) {
  const inputId = useId()
  const statusId = useId()

  return (
    <div className="w-full">
      <label htmlFor={inputId} className="sr-only">
        Buscar Pokémon por nombre o número
      </label>

      <div className="flex items-center gap-3">
        <input
          id={inputId}
          type="search"
          autoComplete="off"
          value={value}
          onChange={(event: ChangeEvent<HTMLInputElement>) => onChange(event.target.value)}
          placeholder="Busca tu pokémon por nombre o número"
          aria-describedby={statusId}
          className="w-full rounded-sm border-2 border-current bg-transparent px-4 py-2 outline-none focus-visible:ring-2"
        />
        <span aria-hidden="true" className="text-2xl">
          ⌕
        </span>
      </div>

      {/* Los lectores de pantalla necesitan saber que la lista cambio. */}
      <p id={statusId} aria-live="polite" className="sr-only">
        {value.trim() === ''
          ? 'Escribe para buscar'
          : `${resultCount} resultado${resultCount === 1 ? '' : 's'}`}
      </p>
    </div>
  )
}
