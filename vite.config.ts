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
  build: {
    rollupOptions: {
      output: {
        // Split the single ~515 kB bundle into cacheable vendor chunks. These
        // libraries change only on dependency upgrades, so browsers keep them
        // across app deploys, and the map/UI chunks load in parallel with app code.
        // Rollup 5 accepts only the function form of manualChunks.
        manualChunks(id: string) {
          if (!id.includes('node_modules')) return
          if (/node_modules\/(react|react-dom|react-router|react-router-dom|scheduler)\//.test(id)) {
            return 'vendor-react'
          }
          if (/node_modules\/(leaflet|react-leaflet|@react-leaflet)\//.test(id)) {
            return 'vendor-map'
          }
          if (/node_modules\/(@radix-ui|lucide-react|class-variance-authority|clsx|tailwind-merge)\//.test(id)) {
            return 'vendor-ui'
          }
        },
      },
    },
    // With the vendor split no single chunk should approach the old 515 kB;
    // 400 kB keeps the warning meaningful instead of muting it entirely.
    chunkSizeWarningLimit: 400,
  },
})
