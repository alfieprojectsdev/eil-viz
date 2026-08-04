import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
// The app fetches a relative /api/... path (see App.jsx), so every environment
// is single-origin and CORS never enters the picture. That means the dev server
// has to stand in for the production reverse proxy: without this proxy, /api
// resolves against Vite itself and returns index.html.
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: process.env.VITE_DEV_API_TARGET || 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
    },
  },
})
