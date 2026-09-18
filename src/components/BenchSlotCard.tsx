import { useState } from 'react'
import { Link } from 'react-router'
import { ConfirmRemoveDialog } from '@/components/ConfirmRemoveDialog'
import type { Pokemon } from '@/data/schema'
import { spriteUrl } from '@/data/sprites'
import { useTeam } from '@/data/teamContext'

/**
 * Un hueco ocupado del banquillo: versión compacta de TeamSlotCard, sin el
 * desglose de debilidades propio (solo cuentan para el total del equipo).
 */
export function BenchSlotCard({ pokemon }: { pokemon: Pokemon }) {
  const { remove } = useTeam()
  const [confirmOpen, setConfirmOpen] = useState(false)

  return (
    <div className="relative flex flex-col items-center gap-1 border-2 border-current/60 p-2 text-center">
      <button
        type="button"
        onClick={() => setConfirmOpen(true)}
        aria-label={`Quitar a ${pokemon.nameEs} del banquillo`}
        className="absolute top-1 right-1 flex h-5 w-5 items-center justify-center rounded-full border border-current/40 text-xs hover:bg-current/10"
      >
        <span aria-hidden="true">✕</span>
      </button>

      <ConfirmRemoveDialog
        open={confirmOpen}
        pokemonName={pokemon.nameEs}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={() => {
          remove(pokemon.id)
          setConfirmOpen(false)
        }}
      />

      <Link to={`/pokemon/${pokemon.name}`} className="flex flex-col items-center gap-1">
        <img
          src={spriteUrl(pokemon.id)}
          alt={pokemon.nameEs}
          width={56}
          height={56}
          decoding="async"
          className="h-14 w-14 object-contain"
        />
        <span className="font-display text-xs tracking-wide uppercase">{pokemon.nameEs}</span>
      </Link>
    </div>
  )
}
