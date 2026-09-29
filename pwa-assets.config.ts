import { defineConfig, minimal2023Preset } from '@vite-pwa/assets-generator/config'

// public/icon.png (generado por branding/build-logo.py) ya trae su fondo y deja el logo dentro de la zona
// segura de los íconos maskable, así que los íconos se generan sin relleno extra ni el fondo blanco por defecto.
export const ICON_BACKGROUND = '#0c0a09'

const noPadding = { padding: 0, resizeOptions: { background: ICON_BACKGROUND, fit: 'contain' as const } }

export default defineConfig({
  headLinkOptions: { preset: '2023' },
  preset: {
    ...minimal2023Preset,
    // Sin reducir la paleta: el degradado del fondo y las plumas se verían granulados
    png: { compressionLevel: 9, quality: 100 },
    transparent: { ...minimal2023Preset.transparent, ...noPadding },
    maskable: { ...minimal2023Preset.maskable, ...noPadding },
    apple: { ...minimal2023Preset.apple, ...noPadding },
  },
  images: ['public/icon.png'],
})
