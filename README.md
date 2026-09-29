# Turnos Inflables

PWA para controlar el tiempo de cada niño en los juegos inflables. Ingresas el nombre y el tiempo, presionas **Iniciar**, y al terminar el celular suena, vibra y dice el nombre en voz alta hasta que confirmas.

Funciona sin internet, se instala desde Chrome y no necesita servidor de aplicación: es un sitio estático.

## Funciones

La app tiene tres pestañas, pensadas para usarse con una mano:

- **Nuevo:** nombre del niño, juego y tiempo con botones rápidos. Debajo muestra solo los **3 próximos en salir**, así la pantalla no crece con cada niño.
- **Activos:** todos los niños en juego en una lista compacta, ordenada por quién sale primero. Tiene buscador (desde 6 niños, ignora tildes) y filtro por juego. Al tocar un niño se abren sus acciones: **+5 min**, **Pausa/Seguir** y **Terminar** (con doble toque).
- **Admin:**
  - **Caja del día:** calendario que parte en el día actual, con los días futuros bloqueados. Al elegir un día muestra lo recaudado, niños distintos, turnos, minutos, el desglose por juego y el detalle de turnos.
  - **Juegos:** agregar y quitar.
  - **Tiempos y precios:** agregar, quitar y cambiar los valores, además del botón de extensión.
  - **Alarma y sonido:** voz, vibración, aviso previo, volumen y prueba de alarma.

Además:

- **Alarma persistente:** pantalla roja con pitido, vibración y voz ("Se acabó el tiempo de Mateo") cada 6 segundos, hasta presionar **Listo** o **+5 min**. Si terminan varios a la vez aparece **Listo todos**.
- **Pantalla siempre encendida** (Screen Wake Lock) mientras haya niños jugando.
- **Navegación con el botón atrás de Android:** cada pantalla tiene su dirección (`#/activos`, `#/admin/caja`…).
- **Datos en el celular** (localStorage): el detalle de cada turno se guarda 60 días; después se conservan los **totales por día** para siempre, así el calendario sigue mostrando la caja sin llenar la memoria.

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

## Despliegue en un VPS con nginx existente

Para un servidor que ya tiene un nginx en Docker atendiendo los puertos 80/443 (como el VPS de `serviciohyh.cl`), la app se agrega sin tocar los otros sitios:

- [deploy/docker-compose.prod.yml](deploy/docker-compose.prod.yml) levanta el contenedor `turnos-web` **sin puertos públicos**, dentro de la red del nginx (`PROXY_NETWORK`, por defecto `taller_default`).
- [deploy/nginx/turnos.conf](deploy/nginx/turnos.conf) es el virtual host que se copia al `conf.d` del nginx. Resuelve el contenedor en cada petición: si `turnos-web` está detenido, solo este subdominio responde 502 y nginx sigue arrancando normalmente para los demás sitios.

```bash
git clone https://github.com/michael-urzua-y/juegos.git /opt/juegos
cd /opt/juegos && docker compose -f deploy/docker-compose.prod.yml up -d --build
cp deploy/nginx/turnos.conf /opt/taller/nginx/conf.d/
docker exec hyh-nginx nginx -t && docker exec hyh-nginx nginx -s reload
```

Actualizar: `git pull && docker compose -f deploy/docker-compose.prod.yml up -d --build`.

## Despliegue sin Docker (Cloudflare Pages, gratis)

1. Sube el repositorio a GitHub.
2. En Cloudflare Pages: **Create project → Connect to Git**.
3. Build command: `npm run build` · Output directory: `dist`.
4. Abre la URL en Chrome del celular → menú ⋮ → **Instalar app** (o usa el botón de la app).

Netlify funciona igual. En ambos, las cabeceras de seguridad se aplican desde `dist/_headers`.

## Logo e íconos

El ícono de la app es el logo de **Monay Solutions** (colibrí en el naranja de la app sobre fondo oscuro). Se genera con [branding/build-logo.py](branding/build-logo.py) a partir de `branding/monay-original.png`:

```bash
python3 branding/build-logo.py   # crea branding/monay-solutions-logo.png y public/icon.png
npm run build                    # genera desde public/icon.png los íconos de la PWA
```

## Arquitectura

Organizada por funcionalidad (_features_). Cada módulo expone su API pública en `index.ts` y los demás importan solo desde ahí.

```
src/
  main.ts                    Entrada
  app/                       Composición: layout, rutas y arranque
    bootstrap.svelte.ts      Conecta reloj → turnos → alarma, archivo de caja, persistencia y Wake Lock
    router.svelte.ts         Rutas con hash y pestañas
    App.svelte · AppHeader.svelte · BottomNav.svelte
  features/
    sessions/                Turnos
      model.ts               Reglas de negocio puras (sin Svelte ni navegador) + validación
      store.svelte.ts        Estado reactivo y acciones
      draft.svelte.ts        Formulario compartido ("Repetir")
      tone.ts                Colores por estado
      NewView.svelte · ActiveView.svelte · components/
    alarm/                   Alarma: sonido, voz, repetición, notificación y pantalla roja
    reports/                 Caja: stats.ts puro, archivo de totales diarios y vista con calendario
    settings/                Ajustes: schema.ts validado, store y editores
    admin/                   Menú de administración: compone caja y ajustes
  shared/
    config/                  Constantes y límites de la app
    lib/                     Utilidades puras: tiempo, formato, validación, storage, reloj
    platform/                APIs del navegador: audio, Wake Lock, instalación, notificaciones
    ui/                      Componentes reutilizables: Calendar, MenuItem, Toaster, Icon, NumberField, Toggle…
config/security.ts           Fuente única de CSP y cabeceras de seguridad
docker/                      nginx y Caddy
```

Reglas:

- **Dependencias en una sola dirección:** `app → features → shared`. `shared` no conoce a nadie; entre _features_, solo a través de `index.ts` y sin ciclos (`admin` → `reports`/`settings`; `alarm` y `reports` → `sessions` → `settings`).
- **Lógica pura separada del estado:** `model.ts`, `schema.ts`, `stats.ts` y el calendario en `time.ts` no dependen de Svelte ni del navegador y tienen tests.
- **Sin duplicación:** límites en `shared/config`, colores por estado en `tone.ts`, textos de voz en `alarm/messages.ts`, y cabeceras de seguridad generadas desde un único archivo.

## Seguridad

- **Validación de entradas:** todo lo que escribe el usuario y todo lo que se lee de localStorage pasa por un parser (`parseSessions`, `parseSettings`, `parseArchive`) que descarta datos corruptos o manipulados, limita largos y rangos y elimina caracteres de control y de dirección de texto.
- **Sin inyección de HTML:** Svelte escapa todo el texto. El único `{@html}` es para íconos fijos, nunca con datos del usuario.
- **Content Security Policy estricta:** solo recursos del mismo origen, sin scripts ni estilos en línea, sin `eval`, sin iframes (`frame-ancestors 'none'`).
- **Cabeceras HTTP:** `nosniff`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy` (solo se permite Wake Lock), COOP/CORP y HSTS. Se definen una vez en `config/security.ts` y el build las aplica a `index.html`, `_headers` (Cloudflare/Netlify) y nginx (Docker).
- **Sin datos personales fuera del celular:** no hay servidor, cuentas ni analítica.
- **Contenedor endurecido:** usuario sin privilegios, solo lectura, `cap_drop: ALL`, `no-new-privileges`, sin versión de nginx expuesta y sin servir archivos ocultos.

## Próximos pasos posibles

- Notificaciones push desde un backend (Go) para que suene con el celular bloqueado.
- Sincronizar varios celulares si atiende más de una persona.
