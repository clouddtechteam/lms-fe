import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    include: ['@zoom/meetingsdk'],
  },
  css: {
    // Allow CSS imports from node_modules (needed for Zoom SDK CSS)
    preprocessorOptions: {},
  },
})

