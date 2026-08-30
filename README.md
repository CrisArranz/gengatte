# Gengatte

Pokédex analítica: escribes el nombre de un Pokémon y obtienes sus tipos, sus debilidades y fortalezas
por tipo, sus estadísticas mínimas y máximas a nivel 100, y la naturaleza óptima recomendada.

El plan completo del proyecto está en [PLAN.md](PLAN.md).

## Estado

Fase 0 completada: scaffold con Vite, React, TypeScript, Tailwind CSS v4 y Vitest.

## Requisitos

Node.js 24.x (ver `engines` en `package.json`).

## Puesta en marcha

```bash
npm install
npm run dev
```

## Scripts

| Script | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo con recarga en caliente |
| `npm run build` | Comprobación de tipos + build de producción en `dist/` |
| `npm run preview` | Sirve el build de producción en local |
| `npm test` | Tests con Vitest |
| `npm run test:watch` | Tests en modo observación |
| `npm run lint` | ESLint |
| `npm run format` | Prettier sobre el proyecto |

## Datos

Los datos provienen de [PokeAPI](https://pokeapi.co). Se descargan **una sola vez** en tiempo de build
mediante un script y se sirven como JSON estáticos, de modo que la aplicación no hace ninguna petición
a PokeAPI en tiempo de ejecución. Las imágenes sí son remotas. Detalles en la sección 2 de `PLAN.md`.
