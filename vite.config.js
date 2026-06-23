import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  base: './',
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8888/maps_se', // MAMP default url path, falls back if customized in settings
        changeOrigin: true,
      }
    }
  }
})
