import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    // Debe coincidir con "paths" de tsconfig.json: TypeScript resuelve el
    // alias para el editor, pero quien lo resuelve en el build es Vite.
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
})
