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
    },
  },
})