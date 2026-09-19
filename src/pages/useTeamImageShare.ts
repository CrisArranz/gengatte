import { toBlob } from 'html-to-image'
import { useEffect, useRef, useState } from 'react'
import type { Pokemon } from '@/data/schema'

// Cuánto se queda asentado el aviso de "Imagen copiada" y cuánto tarda cada
// tramo (entrada y salida) de su transición; deben coincidir con la duración
// que se le da por Tailwind (duration-500 en TeamPage).
const TOAST_VISIBLE_MS = 2500
const TOAST_TRANSITION_MS = 500

export type ShareButtonState = 'preparing' | 'ready' | 'sharing' | 'retry'
export type ToastPhase = 'hidden' | 'entering' | 'visible' | 'leaving'

/**
 * html-to-image incrusta cada <img> haciendo su propio fetch() a la URL
 * original para convertirla en data URL. Si el navegador aún no ha
 * terminado de descargarla (el artwork grande de los titulares tarda más
 * que los sprites pequeños del banquillo), ese fetch compite con la
 * descarga real en vez de servirse de la caché HTTP, y a veces falla. Se
 * espera a que cada <img> ya visible haya cargado antes de generar la
 * imagen para compartir.
 */
function waitForImagesToLoad(container: HTMLElement): Promise<void> {
  const images = Array.from(container.querySelectorAll('img'))
  return Promise.all(
    images.map((image) => {
      if (image.complete && image.naturalWidth > 0) return Promise.resolve()
      return new Promise<void>((resolve) => {
        image.addEventListener('load', () => resolve(), { once: true })
        // Una imagen rota no debe bloquear a las demás indefinidamente.
        image.addEventListener('error', () => resolve(), { once: true })
      })
    }),
  ).then(() => undefined)
}

/**
 * html-to-image a veces rechaza con el Event de error de una <img> (no con
 * un Error), típicamente cuando una imagen no carga: String(event) da solo
 * "[object Event]", así que aquí se saca la URL real para saber cuál falló.
 */
function describeError(error: unknown): string {
  if (error instanceof Error) return `${error.name}: ${error.message}`
  if (error instanceof Event) {
    const target = error.target
    if (target instanceof HTMLImageElement) {
      return `Fallo al cargar imagen (evento "${error.type}"): ${target.currentSrc || target.src}`
    }
    return `Evento de error sin detalle: "${error.type}"`
  }
  return String(error)
}

/**
 * Genera en segundo plano la imagen para compartir el equipo (renderizando
 * TeamShareCard, oculto, en el nodo de shareCardRef) y expone una única
 * acción de botón: copiarla al portapapeles, con reintento si la
 * generación falla y un aviso "Imagen copiada" temporizado.
 *
 * Safari exige que clipboard.write() se dispare de forma síncrona dentro
 * del gesto de click: si antes se espera a generar la imagen (toBlob
 * tarda, aunque sea poco), para cuando se llama a clipboard.write() ya ha
 * caducado el permiso y responde con NotAllowedError. Por eso la imagen se
 * genera en segundo plano cada vez que cambia el equipo, y el click solo
 * dispara la llamada con el fichero ya listo.
 */
export function useTeamImageShare(team: (Pokemon | undefined)[], bench: (Pokemon | undefined)[]) {
  const shareCardRef = useRef<HTMLDivElement>(null)
  const shareFileRef = useRef<File | null>(null)

  const [shareReady, setShareReady] = useState(false)
  const [isSharing, setIsSharing] = useState(false)
  const [shareStatus, setShareStatus] = useState<'downloaded' | 'error' | null>(null)
  const [shareError, setShareError] = useState<string | null>(null)
  // Reintentar la preparación (p. ej. si falló) solo requiere cambiar esto
  // para que el efecto de abajo se vuelva a disparar.
  const [prepareRetryToken, setPrepareRetryToken] = useState(0)
  const [prepareError, setPrepareError] = useState<string | null>(null)

  // 'hidden': desmontado. 'entering'/'visible': asentado arriba. 'leaving':
  // animando de vuelta hacia abajo antes de desmontarse.
  const [toastPhase, setToastPhase] = useState<ToastPhase>('hidden')
  const toastHideTimeoutRef = useRef<number | null>(null)
  const toastUnmountTimeoutRef = useRef<number | null>(null)

  useEffect(() => {
    return () => {
      if (toastHideTimeoutRef.current) window.clearTimeout(toastHideTimeoutRef.current)
      if (toastUnmountTimeoutRef.current) window.clearTimeout(toastUnmountTimeoutRef.current)
    }
  }, [])

  function flashCopiedToast() {
    if (toastHideTimeoutRef.current) window.clearTimeout(toastHideTimeoutRef.current)
    if (toastUnmountTimeoutRef.current) window.clearTimeout(toastUnmountTimeoutRef.current)

    // Empieza abajo y transparente; el siguiente frame lo anima hacia su
    // posición final (si se aplicara ya asentado, no habría transición que
    // reproducir: el navegador pintaría directamente el estado final).
    setToastPhase('entering')
    requestAnimationFrame(() => {
      requestAnimationFrame(() => setToastPhase('visible'))
    })

    toastHideTimeoutRef.current = window.setTimeout(() => {
      setToastPhase('leaving')
      toastUnmountTimeoutRef.current = window.setTimeout(
        () => setToastPhase('hidden'),
        TOAST_TRANSITION_MS,
      )
    }, TOAST_VISIBLE_MS)
  }

  useEffect(() => {
    const node = shareCardRef.current
    if (!node) return
    let cancelled = false
    setPrepareError(null)
    const timeoutId = window.setTimeout(() => {
      waitForImagesToLoad(node)
        .then(() => {
          if (cancelled) return undefined
          return toBlob(node, { pixelRatio: 2, backgroundColor: '#ffffff' })
        })
        .then((blob) => {
          if (cancelled || !blob) return
          shareFileRef.current = new File([blob], 'mi-equipo-gengatte.png', { type: 'image/png' })
          setShareReady(true)
        })
        .catch((error: unknown) => {
          if (cancelled) return
          console.error('No se pudo preparar la imagen del equipo:', error)
          setPrepareError(describeError(error))
        })
    }, 300)
    return () => {
      cancelled = true
      window.clearTimeout(timeoutId)
    }
  }, [team, bench, prepareRetryToken])

  function handleShare() {
    if (prepareError) {
      setPrepareRetryToken((token) => token + 1)
      return
    }
    const file = shareFileRef.current
    if (!file) return
    setIsSharing(true)
    setShareStatus(null)
    setShareError(null)

    function reportError(error: unknown) {
      console.error('No se pudo copiar la imagen del equipo:', error)
      setShareStatus('error')
      setShareError(describeError(error))
      setIsSharing(false)
    }

    // Copiar al portapapeles permite pegar la imagen donde haga falta
    // (WhatsApp, un chat...) sin abrir un panel de compartir ni pasar por
    // el disco.
    if (navigator.clipboard && typeof ClipboardItem !== 'undefined') {
      navigator.clipboard
        .write([new ClipboardItem({ [file.type]: file })])
        .then(() => {
          flashCopiedToast()
          setIsSharing(false)
        })
        .catch(reportError)
      return
    }

    // Último recurso para navegadores sin ninguna de las dos APIs.
    const objectUrl = URL.createObjectURL(file)
    const link = document.createElement('a')
    link.download = 'mi-equipo-gengatte.png'
    link.href = objectUrl
    link.click()
    URL.revokeObjectURL(objectUrl)
    setShareStatus('downloaded')
    setIsSharing(false)
  }

  const buttonState: ShareButtonState = isSharing
    ? 'sharing'
    : prepareError
      ? 'retry'
      : shareReady
        ? 'ready'
        : 'preparing'

  return {
    shareCardRef,
    buttonState,
    onButtonClick: handleShare,
    prepareError,
    shareStatus,
    shareError,
    toastPhase,
  }
}
