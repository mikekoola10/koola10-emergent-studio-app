import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      // Manifest is hand-rolled at public/manifest.webmanifest; the plugin
      // only generates the service worker for offline/installable support.
      manifest: false,
      registerType: 'autoUpdate',
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,jpg,jpeg,svg,webmanifest}'],
        // SPA fallback so client-side routes work offline / on refresh
        navigateFallback: 'index.html',
      },
    }),
  ],
  server: {
    port: 5173,
    host: true,
  },
})
