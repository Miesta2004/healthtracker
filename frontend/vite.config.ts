import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  server: {
    proxy: {
      // Fait passer /api par le port du frontend (5173) : le navigateur voit
      // frontend + API comme une seule et même origine, ce qui permet aux
      // cookies httpOnly de fonctionner avec SameSite=Lax sans souci CORS.
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
      // Même origine pour le WebSocket temps réel, pour la même raison que
      // /api ci-dessus : le cookie JWT httpOnly doit être envoyé lors du
      // handshake, ce qui suppose que le navigateur voie une seule origine.
      '/ws': {
        target: 'ws://127.0.0.1:8000',
        ws: true,
      },
    },
  },
})