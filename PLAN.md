# Plan de acción — Pokédex analítica (gengatte)

## 1. Objetivo

Aplicación web donde el usuario escribe el nombre de un Pokémon y obtiene:

1. **Tipos** del Pokémon.
2. **Debilidades / resistencias defensivas**: qué tipo de ataque le hace x4, x2, x1, x0.5, x0.25 o x0.
3. **Fortalezas ofensivas**: contra qué tipos sus movimientos STAB hacen x2, x1, x0.5 o x0.
4. **Estadísticas mínimas y máximas a nivel 100**, y una clasificación derivada del rol: atacante físico, atacante especial, muro físico, muro especial, veloz, mixto.

Restricciones: datos de PokeAPI, **minimizar peticiones en runtime**, imágenes remotas (no almacenadas localmente), React + Tailwind, botón modo claro/oscuro.

---

## 2. Estrategia de datos (punto clave)

### 2.1 Problema con el uso directo de la REST API

`GET https://pokeapi.co/api/v2/pokemon/pikachu` devuelve **291 KB** (verificado): incluye ~700 movimientos, todas las variantes de sprites, encuentros, etc. De todo eso solo necesitamos ~10 campos. Además haría falta 1 petición extra por cada tipo (`/type/{id}`, 18 KB cada una) para calcular efectividades.

Coste por consulta con enfoque naive: **~330 KB y 3-4 peticiones**.

### 2.2 Solución: dataset estático pre-generado en build time

Un script Node se ejecuta **una sola vez** (en desarrollo / CI, no en cada visita), consulta el endpoint **GraphQL de PokeAPI** (`https://graphql.pokeapi.co/v1beta2`, sin API key) y genera ficheros JSON estáticos que se sirven junto a la app.

**Resultado en runtime: 0 peticiones a PokeAPI.** La app solo descarga sus propios JSON estáticos (cacheables por CDN, inmutables).

Una única query GraphQL trae exactamente los campos necesarios de los 1025 Pokémon:

```graphql
query Dataset {
  pokemon(where: { is_default: { _eq: true } }, order_by: { id: asc }) {
    id
    name
    pokemontypes(order_by: { slot: asc }) { type { name } }
    pokemonstats(order_by: { stat_id: asc }) { base_stat stat { name } }
    height
    weight
    pokemonspecy {
      generation { name }
      pokemonspeciesnames(where: { language: { name: { _eq: "es" } } }) { name genus }
    }
  }
  typeefficacy { damage_type_id target_type_id damage_factor }
  type(where: { id: { _lte: 18 } }) {
    id
    name
    typenames(where: { language: { name: { _eq: "es" } } }) { name }
  }
  nature(order_by: { id: asc }) {
    id
    name
    increased_stat_id
    decreased_stat_id
    naturenames(where: { language: { name: { _eq: "es" } } }) { name }
  }
}
```

Las 25 naturalezas vienen en la misma query (verificado: `increased_stat_id` / `decreased_stat_id` son `null` en las 5 neutras, y los nombres en español están disponibles — Firme, Modesta, Miedosa…). Los `stat_id` son `1=hp, 2=attack, 3=defense, 4=special-attack, 5=special-defense, 6=speed`; HP nunca se ve afectado por la naturaleza.

### 2.3 Artefactos generados

| Fichero | Contenido | Tamaño estimado |
|---|---|---|
| `public/data/pokedex.<hash>.json` | Array de 1025 entradas: `id`, `name`, `nameEs`, `types`, `baseStats`, `generation`, `genus` | ~180 KB (~35 KB gzip) |
| `public/data/reference.<hash>.json` | Matriz 18×18 de multiplicadores, nombres de tipo ES/EN y las 25 naturalezas | ~6 KB |
| `src/data/manifest.ts` | Constantes con los nombres de fichero generados + fecha y contadores de validación | <1 KB |

Un solo `pokedex.json` es suficiente: al ser ~35 KB comprimido se carga entero al inicio, habilita búsqueda/autocompletado instantáneo sin red y elimina cualquier latencia por consulta. No hace falta paginar ni trocear.

**Sobre el hash en el nombre**: los ficheros de `public/` no los versiona Vite, así que el script les añade él mismo un hash de contenido y escribe los nombres resultantes en `src/data/manifest.ts`, que sí entra en el bundle versionado. Con eso el JSON se puede servir con `Cache-Control: immutable` (ver sección 9) sin riesgo de servir datos obsoletos tras una regeneración, y sin gastar una petición extra en leer un manifiesto.

### 2.4 Imágenes (remotas, nunca locales)

URL derivada del `id`, sin petición previa para descubrirla:

- Artwork oficial: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/{id}.png`
- Sprite pequeño para la lista: `.../sprites/pokemon/{id}.png`
- Iconos de tipo (para la tabla de la tercera imagen): `.../sprites/types/generation-ix/scarlet-violet/{typeId}.png` — verificado, ~1,4 KB cada uno, 18 en total

Se cargan con `loading="lazy"`, `decoding="async"`, `width`/`height` fijos (evita CLS) y un placeholder con fallback si el recurso falla.

### 2.5 Regeneración

Script `npm run data:build`. Se ejecuta manualmente o en CI cuando PokeAPI publique una nueva generación. El JSON se commitea al repositorio, de modo que el build de producción **nunca depende de que PokeAPI esté disponible**.

---

## 3. Lógica de dominio

### 3.1 Matriz de tipos

Se deriva de las 324 filas de `typeefficacy` (`damage_factor` viene en 0 / 50 / 100 / 200 → se normaliza a 0 / 0.5 / 1 / 2). Se guarda como `chart[tipoAtacante][tipoDefensor] = multiplicador`. No se consulta la API en runtime.

### 3.2 Defensa (debilidades y resistencias)

Para cada uno de los 18 tipos atacantes, se **multiplican** los factores contra cada tipo del Pokémon:

```
mult(atacante) = Π chart[atacante][t]  para t en tipos del Pokémon
```

Buckets resultantes: `x4`, `x2`, `x1`, `x0.5`, `x0.25`, `x0` (inmune).
Ejemplo de validación: Charizard (fuego/volador) → Roca x4, Agua/Eléctrico x2, Tierra x0.

### 3.3 Ataque (fortalezas)

Ojo con el matiz: un Pokémon ataca con **un tipo de movimiento a la vez**, no con la combinación. Por tanto **no se multiplican** los tipos entre sí. Se calcula, para cada tipo del Pokémon por separado, su fila de efectividad contra los 18 tipos defensores.

La UI muestra:
- Una sección por cada tipo del Pokémon (cobertura STAB).
- Una vista "mejor cobertura combinada": para cada tipo defensor, el **máximo** multiplicador alcanzable entre sus tipos — responde a "¿a quién puede golpear fuerte este Pokémon?".

### 3.4 Estadísticas a nivel 100 (fórmulas gen III+)

```
HP    = floor( (2*Base + IV + floor(EV/4)) * Nivel / 100 ) + Nivel + 10
Otras = ( floor( (2*Base + IV + floor(EV/4)) * Nivel / 100 ) + 5 ) * Naturaleza
```

- **Mínimo**: IV 0, EV 0, naturaleza perjudicial (×0.9).
- **Máximo**: IV 31, EV 252, naturaleza beneficiosa (×1.1).
- Casos especiales: HP no aplica naturaleza; Shedinja tiene HP fijo = 1.

Se muestra el rango min–max por estadística, más el valor "neutro" (IV 31, EV 0, naturaleza 1.0) como referencia realista.

### 3.5 Clasificación de rol

Se calcula a partir de las **estadísticas base** (no de los extremos, que están inflados por igual):

- **Sesgo ofensivo**: `attack` vs `special-attack`. Diferencia ≥ 15 → físico o especial; si no → mixto.
- **Sesgo defensivo**: `defense` vs `special-defense`, ponderado por `hp` para dar la resistencia efectiva real.
- **Etiquetas adicionales**: "veloz" si `speed ≥ 100`; "tanque" si `hp + defense + special-defense` está en el percentil alto del dataset; "frágil" si está en el bajo.

Los percentiles se precalculan en el script de datos sobre los 1025 Pokémon, de modo que las etiquetas son relativas al conjunto real y no a umbrales inventados.

### 3.6 Naturaleza óptima (sección "tips" del boceto)

**Cómo funcionan**: una naturaleza sube un 10 % una estadística y baja un 10 % otra, entre las cinco que no son HP (ataque, defensa, ataque especial, defensa especial, velocidad). De las 25, cinco son neutras (suben y bajan la misma, efecto nulo).

**Algoritmo de recomendación**, a partir de las estadísticas base y del rol de 3.5:

1. **Elegir la estadística que se sube**
   - Si el Pokémon es rápido y ofensivo (velocidad en percentil alto), la velocidad suele valer más que la potencia: adelantarse decide el combate. Se propone subir velocidad.
   - Si no, se sube la estadística ofensiva dominante (ataque o ataque especial, la mayor).
   - Si el rol es defensivo, se sube la defensa **más alta** de las dos: reforzar el punto fuerte rinde más que parchear el débil, porque el daño recibido escala de forma inversa a la defensa.

2. **Elegir la estadística que se baja** — regla clave: bajar la que el Pokémon **no usa**.
   - Atacante físico → baja ataque especial.
   - Atacante especial → baja ataque. Aquí hay un matiz real: bajar el ataque también reduce el daño que recibe de *Judo* (Foul Play) y del daño por confusión, así que es una bajada con ventaja añadida.
   - Nunca se baja la estadística que se sube, ni la velocidad en un Pokémon rápido, ni el HP (imposible).

3. **Traducir el par (sube, baja) a la naturaleza concreta** usando la tabla de 25 ya incluida en el dataset.

**Salida en la interfaz**: 2–3 naturalezas candidatas, cada una con su nombre en español e inglés, el `+10 % / −10 %` explícito, los valores resultantes a nivel 100 y una frase corta que explique el porqué ("Miedosa: máxima velocidad sacrificando el ataque físico, que este Pokémon no usa").

**Aviso honesto que debe aparecer en la ficha y en las FAQs**: es una recomendación derivada solo de las estadísticas base. El metajuego real depende también de movimientos, habilidad, objeto y formato de combate. Se presenta como orientación, no como verdad competitiva.

---

## 4. Stack técnico

| Área | Elección | Motivo |
|---|---|---|
| Build | Vite | Arranque y HMR rápidos, build estático |
| UI | React 19 + TypeScript | Requisito + seguridad de tipos en el modelo de datos |
| Estilos | Tailwind CSS v4 | Requisito; `@theme` para tokens, variante `dark` por clase |
| Rutas | React Router | Menú con varias páginas (inicio, ficha, FAQs, tabla de tipos) y enlaces compartibles |
| Tipografía | Verdana con la pila por defecto de Tailwind como respaldo | Decisión provisional del usuario; se cambia en un solo token de `@theme` |
| Verificación | Aserciones dentro de `build-data.mjs` | **Sin framework de tests** (decisión del usuario). La corrección se garantiza validando el dataset contra valores conocidos al generarlo |
| Datos | Script Node + GraphQL PokeAPI | Ver sección 2 |
| Lint | ESLint + Prettier | Consistencia |
| Servidor de producción | Express mínimo (`server.js`) | Heroku necesita un proceso que escuche en `$PORT`; ver sección 9 |
| Despliegue | Heroku, buildpack `heroku/nodejs` | Requisito (suscripción existente) |

Sin librería de estado global: el dataset se carga una vez en un contexto de React y el resto es estado local derivado.

Express es la única dependencia que se ejecuta **en el servidor**. React, React Router y Tailwind se compilan dentro del bundle, así que tras el build ya no se necesitan en el slug; Heroku poda las `devDependencies` después de compilar, nunca antes.

---

## 5. Estructura de ficheros

```
gengatte/
├─ scripts/
│  └─ build-data.mjs           # genera pokedex.json + typechart.json
├─ public/
│  └─ data/                    # JSON estáticos generados (commiteados)
├─ server.js                   # Express: sirve dist/ en $PORT (solo producción)
├─ Procfile                    # web: node server.js
├─ app.json                    # metadatos Heroku (opcional, review apps)
├─ .node-version               # versión de Node para el buildpack
├─ src/
│  ├─ domain/
│  │  ├─ typeChart.ts          # defensiva y ofensiva
│  │  ├─ stats.ts              # fórmulas nivel 100
│  │  ├─ role.ts               # clasificación de rol
│  │  └─ nature.ts             # naturaleza óptima (3.6)
│  ├─ data/
│  │  ├─ usePokedex.ts         # carga única del dataset
│  │  ├─ manifest.ts           # generado por el script
│  │  └─ search.ts             # normalización + búsqueda difusa
│  ├─ pages/
│  │  ├─ HomePage.tsx          # imagen 1: buscador + tarjeta de resultado
│  │  ├─ PokemonPage.tsx       # imagen 2: ficha con la rejilla 2x2
│  │  ├─ FaqPage.tsx           # naturalezas, multiplicadores, cómo se calcula todo
│  │  └─ TypeChartPage.tsx     # imagen 3: matriz 18x18 completa
│  ├─ components/
│  │  ├─ AppMenu.tsx           # navegación entre páginas
│  │  ├─ SearchBar.tsx
│  │  ├─ PokemonCard.tsx       # tarjeta de resultado del buscador
│  │  ├─ TypeBadge.tsx
│  │  ├─ EffectivenessGrid.tsx # usado en fortalezas y debilidades
│  │  ├─ StatRange.tsx
│  │  ├─ NatureTips.tsx        # panel "tips" de la ficha
│  │  └─ ThemeToggle.tsx
│  ├─ theme/useTheme.ts
│  ├─ App.tsx                  # rutas + layout
│  └─ main.tsx
├─ index.html
└─ PLAN.md
```

---

## 6. Interfaz (según los bocetos)

Cuatro vistas, con un menú común en la cabecera junto al botón de tema.

| Ruta | Vista | Origen |
|---|---|---|
| `/` | Inicio: título "Gengatte", buscador, tarjetas de resultado | Boceto 1 |
| `/pokemon/:nombre` | Ficha del Pokémon | Boceto 2 |
| `/tabla-tipos` | Matriz completa de efectividades | Boceto 3 |
| `/faq` | Preguntas frecuentes | Requisito nuevo |

### 6.1 Inicio (boceto 1)

- Título centrado arriba.
- Barra de búsqueda ancha con la lupa a la derecha, ocupando casi todo el ancho.
- Debajo, a la izquierda, la tarjeta de resultado: imagen del Pokémon y nombre en mayúsculas. Al escribir se muestran las coincidencias como rejilla de tarjetas; al pulsar una se navega a su ficha.
- Búsqueda tolerante a acentos, mayúsculas y guiones (`Nidoran-m`), por nombre en español o inglés y por número de Pokédex. Navegación con flechas y Enter.

### 6.2 Ficha (boceto 2)

- Cabecera: imagen a la izquierda; a la derecha el nombre en mayúsculas y los tipos ("veneno/fantasma").
- Debajo, rejilla de **2×2** con cuatro paneles del mismo peso visual:

| | |
|---|---|
| **Fortalezas** — a qué tipos golpea x2 / x1 / x0.5 / x0 | **Debilidades** — qué le hace x4 / x2 / x1 / x0.5 / x0.25 / x0 |
| **Estadísticas máximas** — rango mín–máx a nivel 100 por estadística | **Tips** — naturaleza óptima (3.6) y rol del Pokémon |

- En móvil la rejilla 2×2 pasa a una sola columna manteniendo ese orden.

### 6.3 Tabla de tipos (boceto 3)

- Matriz 18×18: filas = tipo de ataque, columnas = tipo del Pokémon oponente, con las etiquetas "← POKÉMON OPONENTE →" y "TIPO DE ATAQUE ↓" del boceto.
- Celdas: `x2`, `½`, `·` (neutro) e inmune. **Nunca solo color**: siempre con texto o símbolo, para que sea legible con daltonismo y en modo oscuro.
- Iconos de tipo en las cabeceras (sprites remotos de la sección 2.4), con el nombre del tipo como texto alternativo.
- Fila y columna de cabecera fijas (`position: sticky`) y desplazamiento horizontal en móvil: 18 columnas no caben en 360 px.
- Al pasar el ratón o enfocar una celda, se resalta su fila y columna — sin eso, leer una matriz de 324 celdas es incómodo.

### 6.4 FAQs

- **Naturalezas**: qué son, la tabla de las 25 con su `+10 % / −10 %`, cuáles son neutras, por qué el HP nunca se ve afectado, y cómo elige la app la recomendación (con el aviso de 3.6).
- **Multiplicadores**: por qué el x4 solo aparece en Pokémon de doble tipo, y por qué en ataque los tipos no se multiplican entre sí (3.3).
- **Estadísticas**: las fórmulas de 3.4 y qué son IV, EV y nivel 100.
- **Datos**: origen PokeAPI, fecha de generación del dataset y por qué la app no hace peticiones en vivo.

### 6.5 Transversal

- **Menú**: enlaces a Inicio, Tabla de tipos y FAQs; en móvil se pliega. Marca la ruta activa con `aria-current`.
- **Tipografía**: Verdana con respaldo a la pila por defecto de Tailwind, definida como un único token de `@theme`. Cambiarla más adelante es tocar una línea.
- **Modo claro/oscuro**: botón en la cabecera. Clase en `<html>`, persistencia en `localStorage`, valor inicial desde `prefers-color-scheme`, y script inline en `index.html` que aplica la clase antes del primer render para evitar el parpadeo blanco.
- **Responsive y accesible**: contraste AA, foco visible, `aria-live` en los resultados de búsqueda, y ninguna información codificada solo por color (siempre acompañada del texto "x2", "x0.5", …).

---

## 7. Rendimiento

- 0 peticiones a PokeAPI en runtime; solo un JSON estático cacheado.
- Índice de búsqueda y matriz de tipos precalculados en memoria una sola vez.
- Cálculos de efectividad/estadísticas memoizados por Pokémon.
- Imágenes remotas, diferidas, con dimensiones reservadas.
- Objetivo: Lighthouse Performance ≥ 95, sin bloqueo de red tras la carga inicial.

---

## 8. Fases de ejecución

| Fase | Contenido | Criterio de aceptación |
|---|---|---|
| **0. Scaffold** | Vite + React + TS + Tailwind v4, ESLint/Prettier | `npm run dev` sirve una página con Tailwind aplicado |
| **1. Datos** | `scripts/build-data.mjs`, validación de la respuesta, JSON generados | `npm run data:build` produce 1025 entradas y una matriz 18×18 válida |
| **2. Dominio** | `typeChart.ts`, `stats.ts`, `role.ts`, `nature.ts` | Comprobación manual en pantalla con casos conocidos: Charizard x4 roca, Ferrothorn x4 fuego, Gengar inmune a normal/lucha, HP máx de Blissey = 714, naturaleza Firme para un atacante físico y Miedosa para un veloz especial |
| **3. Búsqueda** | Carga del dataset, normalización, autocompletado | Escribir "char" propone Charmander/Charmeleon/Charizard; "25" encuentra a Pikachu |
| **4. Rutas y vistas** | React Router, menú, las 4 páginas de la sección 6 sin refinar el estilo | Inicio, ficha, tabla de tipos y FAQs navegables; los 4 objetivos de la sección 1 más los tips visibles para cualquier Pokémon |
| **5. Tema + despliegue** | `useTheme`, botón anti-parpadeo, `server.js`, `Procfile`, primer `git push heroku main` | App accesible en la URL de Heroku, tema persistido, sin flash al recargar, y `/faq` recargado en caliente sirve la app (no un 404) |
| **6. Diseño visual** | Maquetación de los 3 bocetos, rejilla 2×2 de la ficha, matriz con cabeceras fijas, paleta, Verdana | Coincide con los bocetos en claro y oscuro, a partir de 360 px de ancho |
| **7. Pulido** | Accesibilidad, estados de carga/error, 404, README, Lighthouse | Lighthouse ≥ 95 en Performance y Accesibilidad sobre la URL de Heroku |

El despliegue se adelanta a la fase 5, **antes** del diseño visual: así el trabajo de estilo se valida directamente sobre el entorno real y no aparecen sorpresas de producción al final. Con rutas reales, el fallback SPA del `server.js` (sección 9.2) deja de ser un detalle teórico: sin él, recargar `/faq` devolvería 404.

### 8.1 Flujo de trabajo con Git

**Regla: cada fase termina con un commit propio.** El historial refleja las fases del plan, de modo que se puede ver qué aportó cada una y volver a cualquier punto estable.

- Formato: [Conventional Commits](https://www.conventionalcommits.org). Asunto en inglés, ≤ 50 caracteres.
- Un commit de cierre por fase, con el número de fase en el cuerpo para poder rastrearlo:

  ```
  chore(scaffold): set up vite, react, tailwind

  Fase 0 del PLAN.md. Criterio de aceptación verificado:
  npm run dev sirve la página con Tailwind aplicado.
  ```

- Correcciones o cambios intermedios dentro de una fase pueden ir en sus propios commits (`fix:`, `refactor:`, `docs:`); el commit de cierre es el que marca la fase como completada.
- Los cambios en `PLAN.md` van como `docs(plan): …`.
- El dataset generado se commitea aparte: `chore(data): regenerate pokedex dataset`, para que un cambio de datos no se mezcle con cambios de código.
- Se trabaja sobre `main`: proyecto de un solo autor y Heroku despliega desde esa rama. Nada se sube a Heroku hasta la fase 5.
- Antes de cada commit de cierre deben pasar `npm run lint` y `npm run build`, y el criterio de aceptación de la fase debe verificarse a mano en el navegador.

---

## 9. Despliegue en Heroku

### 9.1 Enfoque

La app es un SPA estático, pero Heroku exige un proceso que escuche en `$PORT`; no sirve ficheros por sí solo. Se usa el buildpack oficial `heroku/nodejs` con un servidor Express mínimo. (Se descarta el buildpack estático de la comunidad: está sin mantenimiento y no permite controlar las cabeceras de caché que necesita el dataset.)

Flujo del buildpack en cada `git push heroku main`:

1. Instala **todas** las dependencias, incluidas las de desarrollo.
2. Ejecuta el script `heroku-postbuild` → `vite build` → genera `dist/`.
3. Poda las `devDependencies`, dejando solo Express en el slug.
4. Arranca el proceso `web` del `Procfile`.

`dist/` **no** se commitea: lo construye Heroku. Los JSON de datos sí, porque el build no debe depender de PokeAPI (sección 2.5).

### 9.2 Ficheros necesarios

**`Procfile`**
```
web: node server.js
```

**`package.json`** (fragmentos)
```json
{
  "engines": { "node": "24.x" },
  "scripts": {
    "build": "vite build",
    "heroku-postbuild": "npm run build",
    "start": "node server.js",
    "data:build": "node scripts/build-data.mjs"
  },
  "dependencies": { "express": "^5", "compression": "^1" }
}
```

**`server.js`** — responsabilidades:

- Escuchar en `process.env.PORT` (nunca un puerto fijo) y en `0.0.0.0`.
- `compression()`: el router de Heroku **no** comprime por su cuenta; sin esto el JSON viajaría a 180 KB en vez de 35 KB.
- Servir `dist/` con caché por tipo de recurso:
  - `assets/*` (nombres con hash de Vite) → `Cache-Control: public, max-age=31536000, immutable`
  - `data/*.json` (hasheados por el script, sección 2.3) → mismo `immutable`
  - `index.html` → `no-cache`, para que un despliegue nuevo se recoja de inmediato
- Fallback SPA: cualquier ruta no encontrada devuelve `index.html`, **excepto** las que empiezan por `/data/` o `/assets/`, que deben devolver 404 real para no enmascarar un fichero ausente con HTML.
- `GET /healthz` → `200 OK`, para comprobaciones y monitorización.
- Cabeceras de seguridad básicas: `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin` y una CSP que permita las imágenes de `raw.githubusercontent.com`.

**`.node-version`**: `24` — fija la misma versión mayor que se usa en local (24.11.1) y evita que un cambio de versión por defecto del buildpack rompa el build.

### 9.3 Puesta en marcha (una sola vez)

```bash
heroku create gengatte --stack heroku-24
heroku buildpacks:set heroku/nodejs
heroku config:set NODE_ENV=production
git push heroku main
heroku open
```

Sin add-ons, sin base de datos, sin variables secretas: la app no tiene backend con estado. Un dyno **Basic** es suficiente y no se duerme.

### 9.4 Verificación posterior al despliegue

- `curl -I https://<app>.herokuapp.com/healthz` → 200.
- La respuesta del JSON de datos llega con `content-encoding: gzip` y `cache-control: immutable`.
- Recarga profunda en una ruta interna (por ejemplo `/pokemon/pikachu` si se añaden rutas) → sirve la app, no un 404.
- Lighthouse ejecutado contra la URL de Heroku, no contra localhost.

### 9.5 Despliegue continuo (opcional, fase 7)

Conectar el repositorio de GitHub a Heroku con despliegue automático desde `main`, condicionado a que pase un workflow de CI con `lint` y `build`. Alternativa sin coste añadido: mantener el `git push heroku main` manual.

---

## 10. Riesgos y decisiones abiertas

- **Formas alternativas** (Mega, Gigamax, formas regionales de Deoxys/Rotom…): la fase 1 filtra por `is_default: true` (1025 entradas). Añadirlas después es solo cambiar el filtro del script; se deja fuera del alcance inicial para no complicar la búsqueda.
- **Habilidades que alteran la efectividad** (Levitación, Absorbe Agua, Pararrayos): no se contemplan en el cálculo. Se puede añadir más adelante como nota informativa en la ficha.
- **Esquema GraphQL de PokeAPI**: `v1beta2` es la versión actual; si cambiara, solo hay que tocar `scripts/build-data.mjs`, porque el JSON ya commiteado sigue sirviendo a la app.
- **Datos de Tera/generación 10**: al regenerar el dataset se incorporan automáticamente.
- **Tipografía**: Verdana es provisional. Al estar como token único de `@theme`, cambiarla luego (incluida una fuente web) no toca ningún componente.
- **Recomendación de naturaleza**: heurística basada solo en estadísticas base, sin movimientos ni objetos. Se muestra con su aviso correspondiente (3.6). Si más adelante interesa afinarla, la vía sería incorporar el conjunto de movimientos, lo que exige ampliar el dataset.
- **Coste en Heroku**: dyno Basic siempre activo. Si en algún momento interesa abaratarlo, la app es 100 % estática y podría servirse desde un CDN, pero eso contradice el requisito de desplegar en Heroku, así que no se contempla.

---

## 11. Siguiente paso

Bocetos recibidos y plan cerrado. Ejecutar las fases 0 → 7 en orden, validando el criterio de aceptación de cada una antes de pasar a la siguiente.
