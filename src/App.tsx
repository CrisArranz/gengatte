import { BrowserRouter, Link, Outlet, Route, Routes } from 'react-router'
import { AppMenu } from '@/components/AppMenu'
import { GengatteMark } from '@/components/GengatteMark'
import { ThemeToggle } from '@/components/ThemeToggle'
import { PokedexProvider } from '@/data/PokedexProvider'
import { useDatasetState } from '@/data/pokedexContext'
import { FaqPage } from '@/pages/FaqPage'
import { HomePage } from '@/pages/HomePage'
import { NotFoundPage } from '@/pages/NotFoundPage'
import { PokemonPage } from '@/pages/PokemonPage'
import { TypeChartPage } from '@/pages/TypeChartPage'

/**
 * Todas las paginas leen el dataset, asi que la espera se resuelve una vez
 * aqui: por debajo de esta puerta `useDataset()` ya no puede fallar.
 */
function DatasetGate() {
  const state = useDatasetState()

  if (state.status === 'loading') return <p className="py-8 text-center">Cargando Pokédex…</p>
  if (state.status === 'error') {
    return (
      <p className="py-8 text-center" role="alert">
        No se pudo cargar la Pokédex: {state.message}
      </p>
    )
  }

  return <Outlet />
}

function Layout() {
  return (
    <>
      {/* En movil es una rejilla de tres columnas con los lados iguales: es lo
          unico que centra el titulo de verdad, sin depender de que el boton de
          menu y el de tema midan lo mismo. En escritorio vuelve a ser la fila de
          siempre. relative, ademas, ancla el panel del menu al borde inferior. */}
      <header className="relative mx-auto grid max-w-4xl grid-cols-[1fr_auto_1fr] items-center gap-3 px-4 py-6 sm:flex sm:gap-4">
        <AppMenu />
        <Link
          to="/"
          // order-first: en el DOM va detras del menu, que es quien ocupa la
          // primera columna en movil; en escritorio el logo manda y va delante.
          className="font-display flex items-center gap-3 text-3xl tracking-wide sm:order-first"
        >
          <GengatteMark className="h-9 w-9 shrink-0" />
          Gengatte
        </Link>
        {/* justify-self solo lo entiende la rejilla: en escritorio no estorba. */}
        <ThemeToggle className="justify-self-end" />
      </header>

      <main className="mx-auto max-w-4xl px-4 pb-12">
        <Outlet />
      </main>
    </>
  )
}

export default function App() {
  return (
    <PokedexProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route element={<DatasetGate />}>
              <Route index element={<HomePage />} />
              <Route path="pokemon/:name" element={<PokemonPage />} />
              <Route path="tabla-tipos" element={<TypeChartPage />} />
              <Route path="faq" element={<FaqPage />} />
            </Route>
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </PokedexProvider>
  )
}
