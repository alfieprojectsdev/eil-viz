import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Proxy API calls in dev so the browser never hits a cross-origin request.
    // The target is read from VITE_API_URL at dev-server startup time; falls
    // back to the local default so Windows and Linux both work out of the box.
    proxy: {
      '/api': {
        target: process.env.VITE_API_URL ?? 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
    },
  },
})
