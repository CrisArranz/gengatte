import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { dirname, join, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import compression from 'compression'
import express from 'express'

/**
 * La aplicacion es un SPA estatico, pero Heroku exige un proceso que escuche
 * en $PORT: no sirve ficheros por su cuenta. Este servidor solo entrega dist/
 * con las cabeceras correctas de cache, compresion y seguridad.
 */

const root = dirname(fileURLToPath(import.meta.url))
const dist = join(root, 'dist')
const indexPath = join(dist, 'index.html')
const port = Number(process.env.PORT) || 3000

const YEAR = 60 * 60 * 24 * 365

/**
 * El script inline de index.html (el que evita el fogonazo blanco al recargar
 * en modo oscuro) necesita permiso explicito en la CSP. Se le calcula el hash
 * al arrancar en vez de escribirlo a mano: asi cambiar ese script nunca deja
 * la pagina rota, y no hace falta abrir la CSP con 'unsafe-inline'.
 */
function inlineScriptHashes(html) {
  const hashes = []
  for (const match of html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)) {
    hashes.push(`'sha256-${createHash('sha256').update(match[1], 'utf8').digest('base64')}'`)
  }
  return hashes
}

let index
try {
  index = readFileSync(indexPath, 'utf8')
} catch {
  console.error(`No existe ${indexPath}. Ejecuta "npm run build" antes de arrancar el servidor.`)
  process.exit(1)
}

const csp = [
  "default-src 'self'",
  `script-src 'self' ${inlineScriptHashes(index).join(' ')}`,
  "style-src 'self'",
  // Las imagenes (artwork, sprites e iconos de tipo) son remotas por diseno.
  "img-src 'self' data: https://raw.githubusercontent.com",
  // html-to-image (imagen para compartir/copiar el equipo) las vuelve a pedir
  // con fetch() para incrustarlas como data URL: eso lo rige connect-src, no
  // img-src, así que sin esto la petición cae y genera una imagen rota.
  "connect-src 'self' https://raw.githubusercontent.com",
  "font-src 'self'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "object-src 'none'",
].join('; ')

const app = express()

// El router de Heroku no comprime por su cuenta: sin esto el dataset viajaria
// a 180 KB en vez de unos 35 KB.
app.use(compression())

app.disable('x-powered-by')
app.use((_request, response, next) => {
  response.setHeader('X-Content-Type-Options', 'nosniff')
  response.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.setHeader('Content-Security-Policy', csp)
  next()
})

app.get('/healthz', (_request, response) => {
  response.type('text/plain').send('ok')
})

app.use(
  express.static(dist, {
    // index.html lo sirve el fallback de mas abajo, con su propia cabecera.
    index: false,
    setHeaders(response, filePath) {
      // assets/ lleva el hash de Vite y data/ el del script de datos: ambos
      // cambian de nombre al cambiar de contenido, asi que son inmutables.
      const inside = filePath
        .slice(dist.length + 1)
        .split(sep)
        .join('/')
      const immutable = inside.startsWith('assets/') || inside.startsWith('data/')
      response.setHeader(
        'Cache-Control',
        immutable ? `public, max-age=${YEAR}, immutable` : 'no-cache',
      )
    },
  }),
)

app.use((request, response) => {
  // Un fichero ausente bajo /assets/ o /data/ es un error real: devolver el
  // index.html lo disfrazaria de pagina en blanco imposible de diagnosticar.
  if (request.path.startsWith('/assets/') || request.path.startsWith('/data/')) {
    response.status(404).type('text/plain').send('No encontrado')
    return
  }

  // Cualquier otra ruta la resuelve React Router en el cliente.
  response.status(200).set('Cache-Control', 'no-cache').type('html').send(index)
})

app.listen(port, '0.0.0.0', () => {
  console.log(`Gengatte escuchando en http://0.0.0.0:${port}`)
})
