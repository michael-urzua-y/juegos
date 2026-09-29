# Turnos Inflables

PWA para controlar el tiempo de cada niño en los juegos inflables. Ingresas el nombre y el tiempo, presionas **Iniciar**, y al terminar el celular suena, vibra y dice el nombre en voz alta hasta que confirmas.

Funciona sin internet, se instala desde Chrome y no necesita servidor de aplicación: es un sitio estático.

## Funciones

- **Turnos:** nombre, juego (opcional) y tiempo con botones rápidos (5, 10, 15, 20 min, configurables).
- **Cuenta regresiva** por niño, con una barra que pasa de verde a amarillo (aviso previo) y luego a rojo.
- **Alarma persistente:** pitido, vibración y voz ("Se acabó el tiempo de Mateo") cada 6 segundos, hasta presionar **Listo** o **+5 min**.
- **Aviso previo** configurable (1, 2 o 3 minutos antes).
- **Pausa, extensión y término anticipado** (con doble toque para evitar errores).
- **Pantalla siempre encendida** (Screen Wake Lock) mientras haya niños jugando.
- **Resumen de caja:** lo recaudado hoy, ayer o en los últimos 7 días, desglosado por juego, con botón para repetir un turno.
- **Ajustes:** tiempos y precios, juegos, extensión, voz, vibración y volumen.
- Los datos se guardan en el celular (localStorage) y el historial se conserva 60 días.

## Cómo funciona el tiempo

Al iniciar un turno se guarda la **hora de término** (`endsAt = Date.now() + minutos`). La pantalla solo calcula `endsAt - ahora`, así que recargar, apagar la pantalla o cerrar la app no desfasa el conteo.

## Límites (Android)

- **Deja la app abierta y en primer plano.** Si cambias a otra app, Chrome congela los temporizadores y la alarma puede sonar recién al volver. Como respaldo, la app intenta mostrar una notificación si diste permiso.
- La alarma usa el **volumen multimedia**, no el del timbre.
- Para eventos largos, conecta el celular a una batería externa: la pantalla queda encendida.

## Desarrollo

Requiere Node 20 o superior.

```bash
npm install
npm run dev          # servidor local con recarga
npm test             # tests unitarios (Vitest)
npm run check        # verificación de tipos
npm run verify       # tipos + tests + formato (lo mismo que corre CI)
npm run format       # formatea con Prettier
npm run build        # genera dist/ (service worker, manifest, íconos y cabeceras)
```

Para probar en el celular en la misma red Wi-Fi: `npm run dev -- --host` y abre la IP que muestra. La instalación y el service worker requieren HTTPS, así que la prueba completa se hace ya desplegada.

## Docker

La imagen tiene dos etapas: Node verifica (tipos y tests) y compila, y **nginx sin privilegios** sirve los archivos estáticos.

```bash
docker compose up -d --build        # http://localhost:8080
PORT=3000 docker compose up -d      # otro puerto
docker compose down
```

Para usarla desde el celular hace falta **HTTPS**. Con un dominio que apunte al servidor (puertos 80 y 443 abiertos), el perfil `https` agrega Caddy con certificado automático de Let's Encrypt:

```bash
DOMAIN=turnos.midominio.cl docker compose --profile https up -d --build
```

El contenedor corre como usuario sin privilegios, con sistema de archivos de solo lectura, sin capacidades de Linux y con healthcheck en `/healthz`.

## Despliegue sin Docker (Cloudflare Pages, gratis)

1. Sube el repositorio a GitHub.
2. En Cloudflare Pages: **Create project → Connect to Git**.
3. Build command: `npm run build` · Output directory: `dist`.
4. Abre la URL en Chrome del celular → menú ⋮ → **Instalar app** (o usa el botón de la app).

Netlify funciona igual. En ambos, las cabeceras de seguridad se aplican desde `dist/_headers`.

## Arquitectura

Organizada por funcionalidad (_features_). Cada módulo expone su API pública en `index.ts` y los demás importan solo desde ahí.

```
src/
  main.ts                    Entrada
  app/                       Composición: layout, navegación y arranque
    bootstrap.svelte.ts      Conecta reloj → turnos → alarma, persistencia y Wake Lock
    App.svelte · AppHeader.svelte · BottomNav.svelte · navigation.svelte.ts
  features/
    sessions/                Turnos
      model.ts               Reglas de negocio puras (sin Svelte ni navegador) + validación
      store.svelte.ts        Estado reactivo y acciones
      draft.svelte.ts        Formulario compartido ("Repetir")
      tone.ts                Colores por estado
      PlayView.svelte · components/
    alarm/                   Alarma: sonido, voz, repetición, notificación y pantalla roja
    summary/                 Resumen de caja (stats.ts puro + vista)
    settings/                Ajustes (schema.ts validado + store + vista y editores)
  shared/
    config/                  Constantes y límites de la app
    lib/                     Utilidades puras: tiempo, formato, validación, storage, reloj
    platform/                APIs del navegador: audio, Wake Lock, instalación, notificaciones
    ui/                      Componentes reutilizables: Icon, IconButton, NumberField, Toggle…
config/security.ts           Fuente única de CSP y cabeceras de seguridad
docker/                      nginx y Caddy
```

Reglas:

- **Dependencias en una sola dirección:** `app → features → shared`. `shared` no conoce a nadie; entre _features_, solo a través de `index.ts` y sin ciclos (`alarm` y `summary` dependen de `sessions`; `sessions` de `settings`).
- **Lógica pura separada del estado:** `model.ts`, `schema.ts` y `stats.ts` no dependen de Svelte ni del navegador y tienen tests.
- **Sin duplicación:** límites en `shared/config`, colores por estado en `tone.ts`, textos de voz en `alarm/messages.ts`, y cabeceras de seguridad generadas desde un único archivo.

## Seguridad

- **Validación de entradas:** todo lo que escribe el usuario y todo lo que se lee de localStorage pasa por un parser (`parseSessions`, `parseSettings`) que descarta datos corruptos o manipulados, limita largos y rangos y elimina caracteres de control y de dirección de texto.
- **Sin inyección de HTML:** Svelte escapa todo el texto. El único `{@html}` es para íconos fijos, nunca con datos del usuario.
- **Content Security Policy estricta:** solo recursos del mismo origen, sin scripts ni estilos en línea, sin `eval`, sin iframes (`frame-ancestors 'none'`).
- **Cabeceras HTTP:** `nosniff`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy` (solo se permite Wake Lock), COOP/CORP y HSTS. Se definen una vez en `config/security.ts` y el build las aplica a `index.html`, `_headers` (Cloudflare/Netlify) y nginx (Docker).
- **Sin datos personales fuera del celular:** no hay servidor, cuentas ni analítica.
- **Contenedor endurecido:** usuario sin privilegios, solo lectura, `cap_drop: ALL`, `no-new-privileges`, sin versión de nginx expuesta y sin servir archivos ocultos.

## Próximos pasos posibles

- Notificaciones push desde un backend (Go) para que suene con el celular bloqueado.
- Sincronizar varios celulares si atiende más de una persona.
