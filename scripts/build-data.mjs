/**
 * Genera el dataset estatico de la aplicacion a partir de PokeAPI.
 *
 * Se ejecuta a mano (`npm run data:build`), NUNCA en tiempo de ejecucion.
 * Salida:
 *   public/data/pokedex.<hash>.json
 *   public/data/reference.<hash>.json
 *   src/data/manifest.ts
 *
 * Ver PLAN.md, seccion 2.
 */

import { createHash } from 'node:crypto'
import { mkdir, readdir, unlink, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const DATA_DIR = join(ROOT, 'public', 'data')
const MANIFEST_PATH = join(ROOT, 'src', 'data', 'manifest.ts')

const ENDPOINT = 'https://graphql.pokeapi.co/v1beta2'
const PAGE_SIZE = 250 // Troceado para no depender del limite de filas del servidor.
const EXPECTED_POKEMON = 1025
const EXPECTED_TYPES = 18
const EXPECTED_NATURES = 25

/** stat_id de PokeAPI, en el orden en que guardamos el array `stats`. */
const STAT_ORDER = ['hp', 'attack', 'defense', 'special-attack', 'special-defense', 'speed']
const STAT_BY_ID = {
  1: 'hp',
  2: 'attack',
  3: 'defense',
  4: 'special-attack',
  5: 'special-defense',
  6: 'speed',
}

const GENERATION_NUMBER = {
  'generation-i': 1,
  'generation-ii': 2,
  'generation-iii': 3,
  'generation-iv': 4,
  'generation-v': 5,
  'generation-vi': 6,
  'generation-vii': 7,
  'generation-viii': 8,
  'generation-ix': 9,
}

// --------------------------------------------------------------------------
// Consultas
// --------------------------------------------------------------------------

const POKEMON_QUERY = `
  query Pokemon($limit: Int!, $offset: Int!) {
    pokemon(
      where: { is_default: { _eq: true }, id: { _lte: ${EXPECTED_POKEMON} } }
      order_by: { id: asc }
      limit: $limit
      offset: $offset
    ) {
      id
      name
      height
      weight
      pokemontypes(order_by: { slot: asc }) { type { name } }
      pokemonstats { base_stat stat_id }
      pokemonspecy {
        generation { name }
        pokemonspeciesnames(where: { language: { name: { _in: ["es", "en"] } } }) {
          name
          genus
          language { name }
        }
      }
    }
  }
`

const REFERENCE_QUERY = `
  query Reference {
    type(where: { id: { _lte: ${EXPECTED_TYPES} } }, order_by: { id: asc }) {
      id
      name
      typenames(where: { language: { name: { _eq: "es" } } }) { name }
    }
    typeefficacy { damage_type_id target_type_id damage_factor }
    nature(order_by: { id: asc }) {
      id
      name
      increased_stat_id
      decreased_stat_id
      naturenames(where: { language: { name: { _eq: "es" } } }) { name }
    }
  }
`

// --------------------------------------------------------------------------
// Utilidades
// --------------------------------------------------------------------------

function fail(message) {
  console.error(`\n[build-data] ERROR: ${message}\n`)
  process.exit(1)
}

function assert(condition, message) {
  if (!condition) fail(message)
}

async function graphql(query, variables = {}, attempt = 1) {
  try {
    const response = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, variables }),
      signal: AbortSignal.timeout(60_000),
    })
    if (!response.ok) throw new Error(`HTTP ${response.status} ${response.statusText}`)

    const payload = await response.json()
    if (payload.errors) throw new Error(JSON.stringify(payload.errors))
    return payload.data
  } catch (error) {
    if (attempt >= 3) fail(`la consulta a PokeAPI fallo tras 3 intentos: ${error.message}`)
    const waitMs = attempt * 2000
    console.warn(`[build-data] intento ${attempt} fallido (${error.message}), reintento en ${waitMs}ms`)
    await new Promise((resolve) => setTimeout(resolve, waitMs))
    return graphql(query, variables, attempt + 1)
  }
}

/** Percentil por interpolacion lineal sobre un array ya ordenado. */
function percentile(sorted, p) {
  const index = (sorted.length - 1) * p
  const low = Math.floor(index)
  const high = Math.ceil(index)
  if (low === high) return sorted[low]
  return sorted[low] + (sorted[high] - sorted[low]) * (index - low)
}

function contentHash(json) {
  return createHash('sha256').update(json).digest('hex').slice(0, 8)
}

// --------------------------------------------------------------------------
// Descarga
// --------------------------------------------------------------------------

async function fetchAllPokemon() {
  const rows = []
  for (let offset = 0; offset < EXPECTED_POKEMON; offset += PAGE_SIZE) {
    const data = await graphql(POKEMON_QUERY, { limit: PAGE_SIZE, offset })
    rows.push(...data.pokemon)
    console.log(`[build-data] pokemon ${rows.length}/${EXPECTED_POKEMON}`)
    if (data.pokemon.length < PAGE_SIZE) break
  }
  return rows
}

// --------------------------------------------------------------------------
// Transformacion
// --------------------------------------------------------------------------

function buildPokedex(rows) {
  let missingSpanishName = 0

  const pokemon = rows.map((row) => {
    const species = row.pokemonspecy
    const names = species?.pokemonspeciesnames ?? []
    const spanish = names.find((entry) => entry.language?.name === 'es')
    const english = names.find((entry) => entry.language?.name === 'en')
    if (!spanish?.name) missingSpanishName += 1

    const stats = new Array(STAT_ORDER.length).fill(null)
    for (const entry of row.pokemonstats) {
      const index = STAT_ORDER.indexOf(STAT_BY_ID[entry.stat_id])
      if (index >= 0) stats[index] = entry.base_stat
    }

    return {
      id: row.id,
      name: row.name,
      // Sin traduccion oficial, el nombre ingles es un respaldo razonable.
      nameEs: spanish?.name ?? english?.name ?? row.name,
      // La categoria en espanol falta en buena parte de la generacion 9.
      genus: spanish?.genus || english?.genus || '',
      gen: GENERATION_NUMBER[species?.generation?.name] ?? 0,
      types: row.pokemontypes.map((entry) => entry.type.name),
      stats,
      height: row.height,
      weight: row.weight,
    }
  })

  if (missingSpanishName > 0) {
    console.warn(`[build-data] aviso: ${missingSpanishName} Pokemon sin nombre en espanol`)
  }
  return pokemon
}

/**
 * Umbrales relativos al conjunto real de Pokemon, no inventados.
 * Los usa la clasificacion de rol (PLAN.md 3.5) y la naturaleza optima (3.6).
 */
function buildPercentiles(pokemon) {
  const speed = pokemon.map((p) => p.stats[5]).sort((a, b) => a - b)
  const bulk = pokemon.map((p) => p.stats[0] + p.stats[2] + p.stats[4]).sort((a, b) => a - b)
  const offense = pokemon.map((p) => Math.max(p.stats[1], p.stats[3])).sort((a, b) => a - b)

  const round = (value) => Math.round(value * 10) / 10
  return {
    speed: { p25: round(percentile(speed, 0.25)), p75: round(percentile(speed, 0.75)), p90: round(percentile(speed, 0.9)) },
    bulk: { p25: round(percentile(bulk, 0.25)), p75: round(percentile(bulk, 0.75)), p90: round(percentile(bulk, 0.9)) },
    offense: { p50: round(percentile(offense, 0.5)), p75: round(percentile(offense, 0.75)) },
  }
}

function buildReference(data) {
  const types = data.type.map((entry) => ({
    id: entry.id,
    name: entry.name,
    nameEs: entry.typenames?.[0]?.name ?? entry.name,
  }))

  const nameById = new Map(types.map((type) => [type.id, type.name]))
  const indexByName = new Map(types.map((type, index) => [type.name, index]))

  // typeefficacy trae las 324 combinaciones completas; el relleno a x1 es solo
  // una red de seguridad por si alguna faltara.
  const chart = types.map(() => new Array(types.length).fill(1))
  for (const row of data.typeefficacy) {
    const attacker = indexByName.get(nameById.get(row.damage_type_id))
    const defender = indexByName.get(nameById.get(row.target_type_id))
    if (attacker === undefined || defender === undefined) continue
    chart[attacker][defender] = row.damage_factor / 100
  }

  const natures = data.nature.map((entry) => ({
    id: entry.id,
    name: entry.name,
    nameEs: entry.naturenames?.[0]?.name ?? entry.name,
    // null en las 5 naturalezas neutras.
    up: STAT_BY_ID[entry.increased_stat_id] ?? null,
    down: STAT_BY_ID[entry.decreased_stat_id] ?? null,
  }))

  return { types, chart, natures }
}

// --------------------------------------------------------------------------
// Validacion: sustituye a los tests unitarios (PLAN.md, seccion 4)
// --------------------------------------------------------------------------

function validate(pokemon, reference) {
  const { types, chart, natures } = reference

  assert(
    pokemon.length === EXPECTED_POKEMON,
    `se esperaban ${EXPECTED_POKEMON} Pokemon y llegaron ${pokemon.length}`,
  )
  assert(types.length === EXPECTED_TYPES, `se esperaban ${EXPECTED_TYPES} tipos y llegaron ${types.length}`)
  assert(natures.length === EXPECTED_NATURES, `se esperaban ${EXPECTED_NATURES} naturalezas y llegaron ${natures.length}`)

  // Integridad de cada Pokemon.
  for (const entry of pokemon) {
    assert(entry.types.length >= 1 && entry.types.length <= 2, `${entry.name} tiene ${entry.types.length} tipos`)
    assert(
      entry.stats.every((value) => Number.isInteger(value) && value > 0),
      `${entry.name} tiene estadisticas incompletas: ${JSON.stringify(entry.stats)}`,
    )
    assert(entry.gen >= 1 && entry.gen <= 9, `${entry.name} tiene generacion invalida: ${entry.gen}`)
  }

  // La matriz solo admite estos cuatro multiplicadores.
  const allowed = new Set([0, 0.5, 1, 2])
  for (let i = 0; i < chart.length; i += 1) {
    for (let j = 0; j < chart[i].length; j += 1) {
      assert(allowed.has(chart[i][j]), `multiplicador invalido en chart[${i}][${j}]: ${chart[i][j]}`)
    }
  }

  // Valores conocidos: si alguno falla, la matriz esta transpuesta o mal mapeada.
  const at = (attacker, defender) => {
    const i = types.findIndex((type) => type.name === attacker)
    const j = types.findIndex((type) => type.name === defender)
    return chart[i][j]
  }
  assert(at('fire', 'grass') === 2, 'fuego contra planta deberia ser x2')
  assert(at('grass', 'fire') === 0.5, 'planta contra fuego deberia ser x0.5')
  assert(at('normal', 'ghost') === 0, 'normal contra fantasma deberia ser x0')
  assert(at('ghost', 'normal') === 0, 'fantasma contra normal deberia ser x0')
  assert(at('electric', 'ground') === 0, 'electrico contra tierra deberia ser x0')
  assert(at('fighting', 'ghost') === 0, 'lucha contra fantasma deberia ser x0')

  // Valores conocidos de Pokemon concretos.
  const byId = new Map(pokemon.map((entry) => [entry.id, entry]))
  const gengar = byId.get(94)
  assert(
    gengar?.types.join('/') === 'ghost/poison',
    `Gengar deberia ser ghost/poison y es ${gengar?.types.join('/')}`,
  )
  assert(byId.get(242)?.stats[0] === 255, 'Blissey deberia tener 255 de HP base')
  assert(byId.get(213)?.stats[2] === 230, 'Shuckle deberia tener 230 de defensa base')

  // Naturalezas: exactamente 5 neutras y ninguna afecta al HP.
  const neutral = natures.filter((nature) => nature.up === null && nature.down === null)
  assert(neutral.length === 5, `deberia haber 5 naturalezas neutras y hay ${neutral.length}`)
  assert(
    natures.every((nature) => nature.up !== 'hp' && nature.down !== 'hp'),
    'ninguna naturaleza puede afectar al HP',
  )
  const adamant = natures.find((nature) => nature.name === 'adamant')
  assert(
    adamant?.up === 'attack' && adamant?.down === 'special-attack',
    'la naturaleza Firme deberia subir ataque y bajar ataque especial',
  )

  console.log('[build-data] validacion superada')
}

// --------------------------------------------------------------------------
// Escritura
// --------------------------------------------------------------------------

/** Borra solo los JSON generados por versiones anteriores de este script. */
async function cleanPreviousOutput() {
  let entries
  try {
    entries = await readdir(DATA_DIR)
  } catch {
    return // La carpeta aun no existe: nada que limpiar.
  }
  const obsolete = entries.filter((file) => /^(pokedex|reference)\.[0-9a-f]{8}\.json$/.test(file))
  await Promise.all(obsolete.map((file) => unlink(join(DATA_DIR, file))))
  if (obsolete.length > 0) console.log(`[build-data] eliminados ${obsolete.length} ficheros anteriores`)
}

async function writeOutput(pokedexPayload, referencePayload) {
  await mkdir(DATA_DIR, { recursive: true })
  await cleanPreviousOutput()

  const pokedexJson = JSON.stringify(pokedexPayload)
  const referenceJson = JSON.stringify(referencePayload)
  const pokedexFile = `pokedex.${contentHash(pokedexJson)}.json`
  const referenceFile = `reference.${contentHash(referenceJson)}.json`

  await writeFile(join(DATA_DIR, pokedexFile), pokedexJson, 'utf8')
  await writeFile(join(DATA_DIR, referenceFile), referenceJson, 'utf8')

  // El manifiesto entra en el bundle versionado por Vite, asi que los JSON
  // pueden servirse con Cache-Control: immutable sin quedarse obsoletos.
  const manifest = `// Generado por scripts/build-data.mjs. No editar a mano.
export const DATA_MANIFEST = {
  pokedex: '/data/${pokedexFile}',
  reference: '/data/${referenceFile}',
  generatedAt: '${pokedexPayload.generatedAt}',
  count: ${pokedexPayload.pokemon.length},
} as const
`
  await mkdir(dirname(MANIFEST_PATH), { recursive: true })
  await writeFile(MANIFEST_PATH, manifest, 'utf8')

  const kb = (text) => `${(Buffer.byteLength(text) / 1024).toFixed(1)} KB`
  console.log(`[build-data] ${pokedexFile} (${kb(pokedexJson)})`)
  console.log(`[build-data] ${referenceFile} (${kb(referenceJson)})`)
  console.log('[build-data] src/data/manifest.ts actualizado')
}

// --------------------------------------------------------------------------

async function main() {
  console.log(`[build-data] descargando desde ${ENDPOINT}`)
  const [pokemonRows, referenceData] = await Promise.all([fetchAllPokemon(), graphql(REFERENCE_QUERY)])

  const pokemon = buildPokedex(pokemonRows)
  const reference = buildReference(referenceData)
  validate(pokemon, reference)

  const generatedAt = new Date().toISOString()
  await writeOutput(
    { generatedAt, statOrder: STAT_ORDER, percentiles: buildPercentiles(pokemon), pokemon },
    { generatedAt, ...reference },
  )
  console.log('[build-data] listo')
}

main()
