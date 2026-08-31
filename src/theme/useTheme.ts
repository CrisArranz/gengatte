import { useCallback, useEffect, useState } from 'react'

/**
 * Tema claro/oscuro con clase en <html>, no con prefers-color-scheme:
 * el boton debe poder imponer su eleccion sobre la del sistema.
 *
 * El valor inicial lo aplica el script inline de index.html antes del primer
 * pintado; aqui solo se lee lo que ya hay puesto, para no provocar un
 * parpadeo ni una segunda escritura innecesaria.
 */

export type Theme = 'light' | 'dark'

export const THEME_STORAGE_KEY = 'gengatte:theme'

function currentTheme(): Theme {
  return document.documentElement.classList.contains('dark') ? 'dark' : 'light'
}

export function useTheme(): { theme: Theme; toggle: () => void } {
  const [theme, setTheme] = useState<Theme>(currentTheme)

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
    document.documentElement.style.colorScheme = theme
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme)
    } catch {
      // Modo privado o almacenamiento bloqueado: el tema sigue funcionando,
      // solo que no se recuerda en la proxima visita.
    }
  }, [theme])

  const toggle = useCallback(() => {
    setTheme((previous) => (previous === 'dark' ? 'light' : 'dark'))
  }, [])

  return { theme, toggle }
}
