import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { defaultAssetName, defineConfig, minimal2023Preset } from '@vite-pwa/assets-generator/config'

// public/icon.png (generado por branding/build-logo.py) ya trae su fondo y deja el logo dentro de la zona
// segura de los íconos maskable, así que los íconos se generan sin relleno extra ni el fondo blanco por defecto.
export const ICON_BACKGROUND = '#0c0a09'
const SOURCE = 'public/icon.png'

// Huella de la imagen en el nombre (pwa-512x512-1a2b3c4d.png): si el logo cambia, cambia la URL.
// Cloudflare hace que el navegador guarde las imágenes 4 horas; con otro nombre nunca se usa un ícono viejo.
export const ICON_VERSION = createHash('sha256')
  .update(readFileSync(new URL(`./${SOURCE}`, import.meta.url)))
  .digest('hex')
  .slice(0, 8)

/** URL pública de un ícono generado, p. ej. iconUrl('pwa', 192) → /pwa-192x192-1a2b3c4d.png */
export const iconUrl = (prefix: string, px: number) => `/${prefix}-${px}x${px}-${ICON_VERSION}.png`

const noPadding = { padding: 0, resizeOptions: { background: ICON_BACKGROUND, fit: 'contain' as const } }

export default defineConfig({
  headLinkOptions: { preset: '2023' },
  preset: {
    ...minimal2023Preset,
    // Sin reducir la paleta: el degradado del fondo y las plumas se verían granulados
    png: { compressionLevel: 9, quality: 100 },
    assetName: (type, size) => defaultAssetName(type, size).replace(/\.png$/, `-${ICON_VERSION}.png`),
    transparent: { ...minimal2023Preset.transparent, ...noPadding },
    maskable: { ...minimal2023Preset.maskable, ...noPadding },
    apple: { ...minimal2023Preset.apple, ...noPadding },
  },
  images: [SOURCE],
})
