/** URLs de los íconos de la PWA (con huella de versión), definidas en vite.config.ts. */
declare const __APP_ICON__: string
declare const __APP_BADGE__: string

interface ImportMetaEnv {
  /** Servidor de la API para la app Android (vacío en la web: mismo dominio). */
  readonly VITE_API_BASE?: string
}
