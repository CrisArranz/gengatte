import {
  DndContext,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import { toBlob } from 'html-to-image'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router'
import { BenchSlotCard } from '@/components/BenchSlotCard'
import { Panel } from '@/components/Panel'
import { TeamDragSlot } from '@/components/TeamDragSlot'
import { TeamShareCard } from '@/components/TeamShareCard'
import { TeamSlotCard } from '@/components/TeamSlotCard'
import { TypeIcon } from '@/components/TypeIcon'
import { useDataset } from '@/data/pokedexContext'
import type { Pokemon } from '@/data/schema'
import { useTeam, type SlotGroup, type SlotRef } from '@/data/teamContext'
import { BENCH_SIZE, MAX_TEAM_SIZE, memberWeaknesses, teamWeaknesses } from '@/domain/team'

function EmptySlot() {
  return (
    <Link
      to="/"
      className="flex h-full min-h-44 flex-col items-center justify-center gap-1 border-2 border-dashed border-current/30 p-3 text-center text-sm opacity-60 hover:opacity-100"
    >
      <span aria-hidden="true" className="text-2xl leading-none">
        +
      </span>
      Añadir Pokémon
    </Link>
  )
}

function EmptyBenchSlot() {
  return (
    <Link
      to="/"
      className="flex h-full min-h-24 flex-col items-center justify-center gap-1 border-2 border-dashed border-current/30 p-2 text-center text-xs opacity-60 hover:opacity-100"
    >
      <span aria-hidden="true" className="text-lg leading-none">
        +
      </span>
      Añadir
    </Link>
  )
}

function parseSlotId(id: string): SlotRef {
  const [group, index] = id.split(':')
  return { group: group as SlotGroup, index: Number(index) }
}

function findPokemon(id: number | null, pokemon: Pokemon[]): Pokemon | undefined {
  if (id === null) return undefined
  return pokemon.find((candidate) => candidate.id === id)
}

export function TeamPage() {
  const { chart, pokedex } = useDataset()
  const { team, bench, move } = useTeam()

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
  )

  // Al soltar un arrastre sobre un hueco (un <Link>), el navegador dispara
  // igualmente un click tras el drop, que navegaría a la ficha del Pokemon
  // en vez de quedarse en la página con el intercambio hecho. dnd-kit intenta
  // frenar ese click el mismo con un listener propio, pero solo detiene la
  // propagación sin cancelar la navegación por defecto del enlace: hace
  // falta un listener propio en window, registrado desde el montaje (antes
  // de que exista el de dnd-kit) para llegar a tiempo de cancelarla.
  const suppressClickRef = useRef(false)

  useEffect(() => {
    function suppressGhostClick(event: MouseEvent) {
      if (suppressClickRef.current) {
        event.preventDefault()
        event.stopPropagation()
      }
    }
    window.addEventListener('click', suppressGhostClick, true)
    return () => window.removeEventListener('click', suppressGhostClick, true)
  }, [])

  const members = useMemo(
    () => team.map((id) => findPokemon(id, pokedex.pokemon)).filter((p): p is Pokemon => !!p),
    [team, pokedex],
  )
  const benchMembers = useMemo(
    () => bench.map((id) => findPokemon(id, pokedex.pokemon)).filter((p): p is Pokemon => !!p),
    [bench, pokedex],
  )

  const teamForShare = useMemo(
    () => team.map((id) => findPokemon(id, pokedex.pokemon)),
    [team, pokedex],
  )
  const benchForShare = useMemo(
    () => bench.map((id) => findPokemon(id, pokedex.pokemon)),
    [bench, pokedex],
  )
  const shareCardRef = useRef<HTMLDivElement>(null)
  // Safari exige que compartir/copiar se dispare de forma síncrona dentro
  // del gesto de click: si antes se espera a generar la imagen (toBlob
  // tarda, aunque sea poco), para cuando se llama a share()/clipboard.write()
  // ya ha caducado el permiso y responde con NotAllowedError. Por eso la
  // imagen se genera en segundo plano cada vez que cambia el equipo, y el
  // click solo dispara la llamada con el fichero ya listo.
  const shareFileRef = useRef<File | null>(null)
  const [shareReady, setShareReady] = useState(false)
  const [isSharing, setIsSharing] = useState(false)
  const [shareStatus, setShareStatus] = useState<'shared' | 'copied' | 'downloaded' | 'error' | null>(
    null,
  )
  const [shareError, setShareError] = useState<string | null>(null)
  // Reintentar la preparación (p. ej. si falló) solo requiere cambiar esto
  // para que el efecto de abajo se vuelva a disparar.
  const [prepareRetryToken, setPrepareRetryToken] = useState(0)
  const [prepareError, setPrepareError] = useState<string | null>(null)

  useEffect(() => {
    const node = shareCardRef.current
    if (!node) return
    let cancelled = false
    setPrepareError(null)
    const timeoutId = window.setTimeout(() => {
      toBlob(node, { pixelRatio: 2, backgroundColor: '#ffffff' })
        .then((blob) => {
          if (cancelled || !blob) return
          shareFileRef.current = new File([blob], 'mi-equipo-gengatte.png', { type: 'image/png' })
          setShareReady(true)
        })
        .catch((error: unknown) => {
          if (cancelled) return
          console.error('No se pudo preparar la imagen del equipo:', error)
          setPrepareError(error instanceof Error ? `${error.name}: ${error.message}` : String(error))
        })
    }, 300)
    return () => {
      cancelled = true
      window.clearTimeout(timeoutId)
    }
  }, [teamForShare, benchForShare, prepareRetryToken])

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
      if (error instanceof Error && error.name === 'AbortError') {
        // El usuario cerrando el panel de compartir no es un fallo real.
        setIsSharing(false)
        return
      }
      console.error('No se pudo compartir la imagen del equipo:', error)
      setShareStatus('error')
      setShareError(error instanceof Error ? `${error.name}: ${error.message}` : String(error))
      setIsSharing(false)
    }

    // En móvil, compartir directo (WhatsApp, Mensajes, etc.) es lo que
    // la mayoría espera al pulsar este botón: se prueba primero.
    if (navigator.canShare?.({ files: [file] })) {
      navigator
        .share({ files: [file], title: 'Mi equipo Gengatte' })
        .then(() => {
          setShareStatus('shared')
          setIsSharing(false)
        })
        .catch(reportError)
      return
    }

    // Sin Web Share (la mayoría de escritorio), copiar al portapapeles
    // permite pegar la imagen donde haga falta sin pasar por el disco.
    if (navigator.clipboard && typeof ClipboardItem !== 'undefined') {
      navigator.clipboard
        .write([new ClipboardItem({ [file.type]: file })])
        .then(() => {
          setShareStatus('copied')
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

  const weaknessesByMember = useMemo(
    () => new Map(members.map((pokemon) => [pokemon.id, memberWeaknesses(chart, pokemon.types)])),
    [members, chart],
  )

  // Las debilidades globales cuentan a titulares y banquillo: es el equipo completo de 10.
  const summary = useMemo(
    () => teamWeaknesses(chart, [...members, ...benchMembers].map((pokemon) => pokemon.types)),
    [members, benchMembers, chart],
  )

  function handleDragStart() {
    suppressClickRef.current = true
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (over && active.id !== over.id) {
      move(parseSlotId(String(active.id)), parseSlotId(String(over.id)))
    }
    // Un tick despues del drop, para tragarse el click fantasma que dispara
    // el navegador sobre el elemento bajo el cursor al soltar.
    requestAnimationFrame(() => {
      suppressClickRef.current = false
    })
  }

  return (
    <div className="space-y-6">
      <header className="text-center">
        <h1 className="font-display text-3xl tracking-wide uppercase">Tu equipo</h1>
        <p className="opacity-70">
          {members.length} / {MAX_TEAM_SIZE} Pokémon
        </p>
        <p className="mt-1 text-xs opacity-60">
          Arrastra una ficha a otro hueco para reordenar el equipo o el banquillo.
        </p>
        <button
          type="button"
          onClick={handleShare}
          disabled={isSharing || (!shareReady && !prepareError)}
          className="mt-3 border-2 border-current px-3 py-1.5 text-sm hover:bg-current/10 disabled:opacity-40"
        >
          {isSharing
            ? 'Compartiendo…'
            : prepareError
              ? 'Reintentar'
              : shareReady
                ? 'Compartir imagen del equipo'
                : 'Preparando imagen…'}
        </button>
        {prepareError && (
          <p className="mt-1 text-xs text-red-500">
            No se pudo generar la imagen del equipo.
            <span className="block opacity-70">{prepareError}</span>
          </p>
        )}
        {shareStatus === 'shared' && (
          <p className="mt-1 text-xs opacity-70">Imagen compartida.</p>
        )}
        {shareStatus === 'copied' && (
          <p className="mt-1 text-xs opacity-70">
            Imagen copiada. Pégala donde quieras (WhatsApp, un chat…).
          </p>
        )}
        {shareStatus === 'downloaded' && (
          <p className="mt-1 text-xs opacity-70">Imagen descargada.</p>
        )}
        {shareStatus === 'error' && (
          <p className="mt-1 text-xs text-red-500">
            No se pudo generar la imagen. Inténtalo de nuevo.
            {shareError && <span className="block opacity-70">{shareError}</span>}
          </p>
        )}
      </header>

      {/*
        Fuera de pantalla pero en el DOM: html-to-image necesita el nodo
        renderizado (con las imagenes reales cargando) para poder capturarlo.
        Con colores fijos y sin controles, para que la imagen descargada solo
        muestre a los 10 Pokemon, sin las debilidades ni la interfaz.
      */}
      <div aria-hidden="true" className="fixed top-0 left-[-9999px]">
        <TeamShareCard ref={shareCardRef} team={teamForShare} bench={benchForShare} />
      </div>

      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          {team.map((id, index) => {
            const pokemon = findPokemon(id, pokedex.pokemon)
            return (
              <TeamDragSlot key={`team-${index}`} id={`team:${index}`} draggable={!!pokemon}>
                {pokemon ? (
                  <TeamSlotCard
                    pokemon={pokemon}
                    weaknesses={weaknessesByMember.get(pokemon.id) ?? []}
                  />
                ) : (
                  <EmptySlot />
                )}
              </TeamDragSlot>
            )
          })}
        </div>

        <section>
          <h2 className="font-display mb-3 text-center text-lg uppercase opacity-80">
            Banquillo · {benchMembers.length} / {BENCH_SIZE}
          </h2>
          <div className="grid grid-cols-4 gap-3">
            {bench.map((id, index) => {
              const pokemon = findPokemon(id, pokedex.pokemon)
              return (
                <TeamDragSlot key={`bench-${index}`} id={`bench:${index}`} draggable={!!pokemon}>
                  {pokemon ? <BenchSlotCard pokemon={pokemon} /> : <EmptyBenchSlot />}
                </TeamDragSlot>
              )
            })}
          </div>
        </section>
      </DndContext>

      <Panel title="Debilidades del equipo">
        {members.length === 0 && benchMembers.length === 0 ? (
          <p className="text-sm opacity-70">Añade Pokémon al equipo para ver sus debilidades combinadas.</p>
        ) : summary.length === 0 ? (
          <p className="text-sm opacity-70">Este equipo no tiene debilidades compartidas relevantes.</p>
        ) : (
          <>
            <ul className="flex flex-wrap gap-4">
              {summary.map(({ type, count }) => (
                <li key={type.id} className="flex flex-col items-center gap-1">
                  <TypeIcon type={type} small width={40} height={40} />
                  <span className="text-xs font-bold tabular-nums">×{count}</span>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-xs opacity-70">
              ×N: número de Pokémon del equipo débiles (x2 o x4) a ese tipo. No se suman los
              multiplicadores individuales, solo se cuentan las debilidades.
            </p>
          </>
        )}
      </Panel>
    </div>
  )
}
