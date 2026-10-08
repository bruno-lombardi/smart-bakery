import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// O app é publicado em https://<usuario>.github.io/smart-bakery/
// Para outro endereço (ex.: Cloudflare Pages), use BASE_PATH=/ no build.
const base = process.env.BASE_PATH ?? '/smart-bakery/'

export default defineConfig({
  base,
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['favicon.png', 'apple-touch-icon.png', 'brand/pao.png'],
      manifest: {
        name: 'Ana Paula – Pães & Afeto',
        short_name: 'Pães & Afeto',
        description: 'Painel de encomendas, preços e caixa da padaria Ana Paula.',
        lang: 'pt-BR',
        theme_color: '#B8352A',
        background_color: '#FBF0DE',
        display: 'standalone',
        orientation: 'any',
        start_url: base,
        scope: base,
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,svg,woff,woff2}'],
        navigateFallback: `${base}index.html`,
        cleanupOutdatedCaches: true,
      },
    }),
  ],
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
