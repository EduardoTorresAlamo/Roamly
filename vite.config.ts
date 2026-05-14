import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: './',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
    // Deduplicate React to prevent "Invalid hook call" from dual React instances
    // (can occur when react-leaflet pulls a different resolution)
    dedupe: ['react', 'react-dom'],
  },
  optimizeDeps: {
    include: ['react-leaflet', 'leaflet', '@react-leaflet/core'],
  },
})
