import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // `npm run dev` serves the UI; everything else is proxied to the backend
    // so the app can use relative URLs (no host baked into the code). In the
    // shipped build the backend serves this bundle itself, same relative URLs.
    proxy: {
      '/api': { target: 'http://localhost:3001', changeOrigin: true },
      '/uploads': { target: 'http://localhost:3001', changeOrigin: true },
      // backend-served media at the root: /loginvideo.mp4, /intovideo.mp4,
      // /success-ap.mp4, etc. (the frontend has no root-level .mp4 of its own)
      '^/[^/]+\\.mp4$': { target: 'http://localhost:3001', changeOrigin: true }
    }
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: false
  }
})
