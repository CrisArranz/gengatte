import { useEffect, useRef } from 'react'

interface ConfirmRemoveDialogProps {
  open: boolean
  pokemonName: string
  onConfirm: () => void
  onCancel: () => void
}

/**
 * Confirmacion antes de quitar un Pokemon del equipo, para que un click
 * accidental en la X no borre nada sin querer.
 *
 * <dialog> nativo: el navegador se encarga solo de atrapar el foco, hacer
 * inerte el resto de la pagina y cerrar con Escape. Un click en el propio
 * <dialog> (fuera de la caja de contenido) cae en su padding o en el
 * backdrop, asi que sirve igual para cerrar al clicar fuera.
 */
export function ConfirmRemoveDialog({
  open,
  pokemonName,
  onConfirm,
  onCancel,
}: ConfirmRemoveDialogProps) {
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  return (
    <dialog
      ref={ref}
      onCancel={onCancel}
      onClose={onCancel}
      onClick={(event) => {
        if (event.target === ref.current) onCancel()
      }}
      className="m-auto border-2 border-current bg-white p-5 text-center backdrop:bg-black/50 dark:bg-slate-950"
    >
      <p className="mb-4 text-sm">
        ¿Quitar a <strong>{pokemonName}</strong> del equipo?
      </p>
      <div className="flex justify-center gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="border-2 border-current px-3 py-1.5 text-sm hover:bg-current/10"
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={onConfirm}
          className="border-2 border-current px-3 py-1.5 text-sm hover:bg-current/10"
        >
          Quitar
        </button>
      </div>
    </dialog>
  )
}
