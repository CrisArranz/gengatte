import { useTheme } from '@/theme/useTheme'

/** Boton de tema de la cabecera (PLAN.md 6.5). */
export function ThemeToggle() {
  const { theme, toggle } = useTheme()
  const dark = theme === 'dark'

  return (
    <button
      type="button"
      onClick={toggle}
      // El estado se anuncia con aria-pressed; el icono solo acompana.
      aria-pressed={dark}
      className="border border-current px-2 py-1 text-sm"
    >
      <span aria-hidden="true">{dark ? '☀' : '☾'}</span>{' '}
      <span>{dark ? 'Modo claro' : 'Modo oscuro'}</span>
    </button>
  )
}
