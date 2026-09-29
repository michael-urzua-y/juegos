/// <reference types="vitest/config" />
import { fileURLToPath } from 'node:url'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'
import { securityHeaders } from './config/security.ts'

export default defineConfig({
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  plugins: [
    tailwindcss(),
    svelte(),
    securityHeaders(),
    VitePWA({
      registerType: 'autoUpdate',
      // Genera los íconos PNG (192, 512, maskable, apple) desde public/icon.svg
      pwaAssets: { config: true },
      manifest: {
        name: 'Turnos Inflables',
        short_name: 'Turnos',
        description: 'Controla el tiempo de cada niño en los juegos y recibe una alarma al terminar.',
        lang: 'es',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait',
        theme_color: '#f97316',
        background_color: '#fff7ed',
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,webmanifest}'],
        // Maneja el toque en la notificación para volver a la app
        importScripts: ['sw-notify.js'],
      },
    }),
  ],
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
  },
})
