/**
 * Fase 0: solo verifica que el scaffold funciona (React + Tailwind + tipografia).
 * Las vistas reales llegan en la fase 4 (ver PLAN.md, seccion 6).
 */
export default function App() {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center gap-4 px-4 text-center">
      <h1 className="text-4xl font-bold tracking-tight">Gengatte</h1>
      <p className="text-slate-600 dark:text-slate-400">
        Scaffold listo: Vite, React, TypeScript, Tailwind y Vitest.
      </p>
    </main>
  )
}
