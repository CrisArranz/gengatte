import { useTheme } from '@/theme/useTheme'

/** Boton de tema de la cabecera (PLAN.md 6.5). */
export function ThemeToggle({ className = '' }: { className?: string }) {
  const { theme, toggle } = useTheme()
  const dark = theme === 'dark'

  return (
    <button
      type="button"
      onClick={toggle}
      // El estado se anuncia con aria-pressed; el icono solo acompana.
      aria-pressed={dark}
      className={`border border-current rounded-lg px-2 py-1 min-w-8 text-sm ${className} cursor-pointer hover:bg-current/10 dark:hover:bg-current/20`}
    >
      <span aria-hidden="true">{dark ? '☀' : '☾'}</span>{' '}
    </button>
  )
}
