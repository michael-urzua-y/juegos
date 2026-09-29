// Fuente única de las cabeceras de seguridad. Un plugin de Vite las aplica en el build:
//  - <meta> CSP en index.html (cualquier hosting estático)
//  - dist/_headers (Cloudflare Pages / Netlify)
//  - .generated/security-headers.conf (nginx en Docker)

import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'
import type { Plugin } from 'vite'

/** La app no carga nada externo: todo es del mismo origen. */
const CSP: Record<string, string> = {
  'default-src': "'self'",
  'script-src': "'self'",
  'style-src': "'self'",
  'img-src': "'self' data:",
  'font-src': "'self'",
  'connect-src': "'self'",
  'worker-src': "'self'",
  'manifest-src': "'self'",
  'object-src': "'none'",
  'base-uri': "'self'",
  'form-action': "'self'",
  'frame-ancestors': "'none'",
}

/** Directivas que el navegador ignora en <meta> y solo sirven como cabecera HTTP. */
const HEADER_ONLY = new Set(['frame-ancestors'])

export function cspString({ forMeta = false } = {}): string {
  return Object.entries(CSP)
    .filter(([name]) => !(forMeta && HEADER_ONLY.has(name)))
    .map(([name, value]) => `${name} ${value}`)
    .join('; ')
}

export const SECURITY_HEADERS: Record<string, string> = {
  'Content-Security-Policy': cspString(),
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'no-referrer',
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Resource-Policy': 'same-origin',
  // Solo se habilita lo que la app usa (pantalla encendida); el resto queda bloqueado.
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), screen-wake-lock=(self)',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
}

const netlifyHeaders = () =>
  [
    '/*',
    ...Object.entries(SECURITY_HEADERS).map(([k, v]) => `  ${k}: ${v}`),
    '/sw.js',
    '  Cache-Control: no-cache',
    '/assets/*',
    '  Cache-Control: public, max-age=31536000, immutable',
    '',
  ].join('\n')

const nginxHeaders = () =>
  Object.entries(SECURITY_HEADERS)
    .map(([k, v]) => `add_header ${k} "${v}" always;`)
    .join('\n') + '\n'

export const NGINX_HEADERS_FILE = '.generated/security-headers.conf'

export function securityHeaders(): Plugin {
  return {
    name: 'security-headers',
    apply: 'build', // En desarrollo Vite inyecta scripts en línea que la CSP bloquearía.
    transformIndexHtml: () => [
      {
        tag: 'meta',
        attrs: { 'http-equiv': 'Content-Security-Policy', content: cspString({ forMeta: true }) },
        injectTo: 'head-prepend',
      },
    ],
    generateBundle() {
      this.emitFile({ type: 'asset', fileName: '_headers', source: netlifyHeaders() })
    },
    closeBundle() {
      mkdirSync(dirname(NGINX_HEADERS_FILE), { recursive: true })
      writeFileSync(NGINX_HEADERS_FILE, nginxHeaders())
    },
  }
}
