import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // Permite abrir el servidor de desarrollo a través de un túnel (p. ej.
    // `npx cloudflared tunnel --url http://localhost:5173`) para probar en
    // el móvil con HTTPS real, necesario para las APIs de Web Share/Clipboard.
    allowedHosts: ['.trycloudflare.com', '.loca.lt'],
  },
  resolve: {
    // Debe coincidir con "paths" de tsconfig.json: TypeScript resuelve el
    // alias para el editor, pero quien lo resuelve en el build es Vite.
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
})
