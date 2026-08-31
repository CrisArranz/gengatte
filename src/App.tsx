import { BrowserRouter, Link, Outlet, Route, Routes } from 'react-router'
import { AppMenu } from './components/AppMenu'
import { ThemeToggle } from './components/ThemeToggle'
import { PokedexProvider } from './data/PokedexProvider'
import { useDatasetState } from './data/pokedexContext'
import { FaqPage } from './pages/FaqPage'
import { HomePage } from './pages/HomePage'
import { NotFoundPage } from './pages/NotFoundPage'
import { PokemonPage } from './pages/PokemonPage'
import { TypeChartPage } from './pages/TypeChartPage'

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
      <header className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-4 px-4 py-6">
        <Link to="/" className="text-2xl tracking-wide">
          Gengatte
        </Link>
        <div className="flex flex-wrap items-center gap-4">
          <AppMenu />
          <ThemeToggle />
        </div>
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
