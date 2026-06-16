import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
// The app fetches an absolute VITE_API_URL (see App.jsx); cross-origin access
// is handled by eil-calc's CORS middleware, so no dev-server proxy is needed.
export default defineConfig({
  plugins: [react()],
})
