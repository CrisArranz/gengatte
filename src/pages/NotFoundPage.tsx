import { Link } from 'react-router'

export function NotFoundPage() {
  return (
    <div className="space-y-3 py-8 text-center">
      <h1 className="font-display text-2xl uppercase">Página no encontrada</h1>
      <p className="opacity-70">Esa dirección no existe en Gengatte.</p>
      <Link to="/" className="underline underline-offset-4">
        Volver al buscador
      </Link>
    </div>
  )
}
