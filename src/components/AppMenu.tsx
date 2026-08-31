import { NavLink } from 'react-router'

const LINKS = [
  { to: '/', label: 'Inicio' },
  { to: '/tabla-tipos', label: 'Tabla de tipos' },
  { to: '/faq', label: 'FAQs' },
]

/** Navegacion comun de la cabecera (PLAN.md 6.5). */
export function AppMenu() {
  return (
    <nav aria-label="Principal">
      <ul className="flex flex-wrap gap-4 text-sm">
        {LINKS.map((link) => (
          <li key={link.to}>
            <NavLink
              to={link.to}
              end={link.to === '/'}
              // aria-current lo pone NavLink por su cuenta en el enlace activo.
              className={({ isActive }) =>
                isActive ? 'underline underline-offset-4' : 'hover:underline'
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
