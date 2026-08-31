import { useEffect, useId, useState } from 'react'
import { NavLink } from 'react-router'

const LINKS = [
  { to: '/', label: 'Inicio' },
  { to: '/tabla-tipos', label: 'Tabla de tipos' },
  { to: '/faq', label: 'FAQs' },
]

/**
 * Las tres barras del boton, que al abrir se cruzan en aspa. Son <span> y no un
 * SVG porque cada barra tiene que animarse por separado, y asi la transicion es
 * la misma utilidad de Tailwind que en el resto de la cabecera.
 */
function MenuIcon({ open }: { open: boolean }) {
  const bar = 'absolute inset-x-0 h-0.5 bg-current transition-transform duration-200'

  return (
    <span aria-hidden="true" className="relative block h-4 w-5">
      <span className={`${bar} top-0 ${open ? 'translate-y-1.75 rotate-45' : ''}`} />
      {/* La del medio no puede plegarse con las otras dos: se va a un lado. */}
      <span
        className={`${bar} top-1.75 transition-opacity ${open ? 'opacity-0' : 'opacity-100'}`}
      />
      <span className={`${bar} bottom-0 ${open ? '-translate-y-1.75 -rotate-45' : ''}`} />
    </span>
  )
}

/**
 * Navegacion comun de la cabecera (PLAN.md 6.5).
 *
 * Una sola lista para los dos tamanos: en escritorio es la fila de enlaces de
 * siempre y en movil el desplegable del boton. Duplicar el <ul> daria dos
 * landmarks de navegacion y dos copias de cada enlace que mantener a la par.
 *
 * El boton ocupa la primera columna de la cabecera en movil y el panel se
 * posiciona contra el <header>, que es quien tiene `relative`.
 */
export function AppMenu() {
  const [open, setOpen] = useState(false)
  const panelId = useId()

  // Escape cierra el panel, como cualquier desplegable del sistema.
  useEffect(() => {
    if (!open) return

    const close = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }

    window.addEventListener('keydown', close)
    return () => window.removeEventListener('keydown', close)
  }, [open])

  return (
    // display:contents: el <nav> agrupa para los lectores de pantalla, pero no
    // se interpone en el flex de la cabecera, que sigue colocando boton y tema.
    <nav aria-label="Principal" className="contents">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={open ? 'Cerrar menú' : 'Abrir menú'}
        // Primera columna de la rejilla en movil, a la izquierda del titulo.
        className="p-1.5 sm:hidden"
      >
        <MenuIcon open={open} />
      </button>

      <ul
        id={panelId}
        // Pulsar un enlace cierra el panel; escuchar aqui evita repetir el
        // manejador en cada NavLink, y dentro del panel no hay nada mas.
        onClick={() => setOpen(false)}
        className={[
          // Movil: panel a lo ancho, colgando del borde inferior de la cabecera.
          open ? 'flex' : 'hidden',
          'menu-panel absolute inset-x-0 top-full z-20 flex-col',
          'border-y border-current/25 bg-white px-4 dark:bg-slate-950',
          // Escritorio: la fila de enlaces de siempre, sin nada de lo anterior.
          'sm:static sm:ml-auto sm:flex sm:flex-row sm:gap-4 sm:border-0 sm:bg-transparent sm:p-0',
        ].join(' ')}
      >
        {LINKS.map((link) => (
          <li key={link.to} className="border-b border-current/15 last:border-0 sm:border-0">
            <NavLink
              to={link.to}
              end={link.to === '/'}
              // aria-current lo pone NavLink por su cuenta en el enlace activo.
              className={({ isActive }) =>
                `block py-3 text-sm sm:py-0 ${isActive ? 'underline underline-offset-4' : 'hover:underline'}`
              }
            >
              {link.label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}
