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

## Cuentas y suscripciones

La app se usa con cuenta. Cada cliente paga una mensualidad y tú administras todo desde **Admin → Clientes** (solo visible para el administrador):

- **Crear cliente:** nombre y usuario; el sistema genera una **clave temporal** (se muestra una sola vez, con botones para copiarla o enviarla). Al primer ingreso el cliente debe crear su propia clave.
- **Un dispositivo por cuenta:** si la cuenta está abierta en un celular, otro no puede entrar ("Tu cuenta está abierta en otro dispositivo"). Para cambiar de celular, el cliente cierra sesión en **Admin → Mi cuenta**, o tú usas **Liberar**. Una sesión sin uso por 30 días se libera sola.
- **Vencimiento automático:** cada cliente parte con 30 días. Al pasar su fecha de vencimiento más 3 días de gracia, se bloquea solo. **Pago** extiende 1, 3, 6 o 12 meses (si ya venció, cuenta desde hoy). **Suspender** bloquea a mano en cualquier momento.
- **Nueva clave:** si el cliente la olvida, genera otra temporal y cierra su sesión.
- El cliente ve un aviso 5 días antes de vencer, y al quedar bloqueado, un botón de WhatsApp para renovar.

**Datos:** la app sigue funcionando sin internet; los turnos, la caja y los ajustes se guardan en el celular y se respaldan en el servidor cuando hay conexión. Si el cliente cambia de celular, recupera todo al ingresar. Al cerrar sesión se borran del celular.

## Cómo funciona el tiempo

Al iniciar un turno se guarda la **hora de término** (`endsAt = Date.now() + minutos`). La pantalla solo calcula `endsAt - ahora`, así que recargar, apagar la pantalla o cerrar la app no desfasa el conteo.

## Límites (Android)

- **Deja la app abierta y en primer plano.** Si cambias a otra app, Chrome congela los temporizadores y la alarma puede sonar recién al volver. Como respaldo, la app intenta mostrar una notificación si diste permiso.
- La alarma usa el **volumen multimedia**, no el del timbre.
- Para eventos largos, conecta el celular a una batería externa: la pantalla queda encendida.

## Desarrollo

Requiere Node 20+ y Go 1.26+.

```bash
npm install
npm run dev          # app en http://localhost:5173 (redirige /api a la API local)
npm test             # tests del frontend (Vitest)
npm run verify       # tipos + tests + formato (lo mismo que corre CI)
npm run build        # genera dist/ (service worker, manifest, íconos y cabeceras)

# API (otra terminal)
cd api
COOKIE_SECURE=false DB_PATH=.data/turnos.db BACKUP_DIR=.data/backups \
  ADMIN_USERNAME=admin ADMIN_PASSWORD=cambiar-esta-clave go run ./cmd/server
go test ./...        # tests unitarios y de integración
```

## Docker

Dos imágenes, ambas sin privilegios, con sistema de archivos de solo lectura y healthcheck:

- **turnos-web:** Node compila la PWA (fallan tipos o tests → falla el build) y nginx la sirve; además deriva `/api` a la API.
- **turnos-api:** Go compila un binario estático (con `vet` y tests) en una imagen _distroless_ sin shell. La base SQLite vive en el volumen `turnos-data`, con un respaldo diario (se guardan 14).

```bash
docker compose up -d --build        # http://localhost:8080 · entra con admin / cambiar-esta-clave
docker compose down                 # detener (los datos quedan en el volumen)
```

## Despliegue en un VPS con nginx existente

Para un servidor que ya tiene un nginx en Docker atendiendo los puertos 80/443 (como el VPS de `serviciohyh.cl`), la app se agrega sin tocar los otros sitios:

- [deploy/docker-compose.prod.yml](deploy/docker-compose.prod.yml): `turnos-web` se une a la red del nginx (`PROXY_NETWORK`, por defecto `taller_default`) **sin puertos públicos**; `turnos-api` queda **solo en la red interna**. Los servicios no se llaman `web`/`api` para no chocar con los alias de otros sitios en la red compartida.
- [deploy/api.env.example](deploy/api.env.example): administrador inicial y contacto de soporte. Se copia a `deploy/api.env` (no se sube a git).
- [deploy/nginx/turnos.conf](deploy/nginx/turnos.conf): virtual host para el `conf.d` del nginx. Toma la IP real solo desde los rangos de Cloudflare y resuelve el contenedor en cada petición (si `turnos-web` está detenido, solo este subdominio responde 502).

```bash
git clone https://github.com/michael-urzua-y/juegos.git /opt/juegos && cd /opt/juegos
cp deploy/api.env.example deploy/api.env && chmod 600 deploy/api.env   # completar
docker compose -f deploy/docker-compose.prod.yml up -d --build
cp deploy/nginx/turnos.conf /opt/taller/nginx/conf.d/
docker exec hyh-nginx nginx -t && docker exec hyh-nginx nginx -s reload
```

Actualizar: `git pull && docker compose -f deploy/docker-compose.prod.yml up -d --build`.
Respaldos: `docker run --rm -v juegos_turnos-data:/data alpine ls /data/backups` (conviene copiarlos fuera del servidor).

## Despliegue sin Docker (Cloudflare Pages)

Solo sirve para la versión sin cuentas: con login, la app necesita la API.

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
  app/                       Composición: layout, rutas, arranque y sesión (account.svelte.ts)
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
    auth/                    Login, cambio de clave, bloqueo y estado de la suscripción
    sync/                    Respaldo y sincronización de los datos con la API
    clients/                 Panel de clientes (solo administrador)
  shared/
    config/                  Constantes y límites de la app
    lib/                     Utilidades puras: tiempo, formato, validación, storage, reloj
    platform/                APIs del navegador: audio, Wake Lock, instalación, notificaciones
    ui/                      Componentes reutilizables: Calendar, MenuItem, Toaster, Icon, NumberField, Toggle…
api/                         API en Go + SQLite (auth, suscripciones, datos, respaldos)
config/security.ts           Fuente única de CSP y cabeceras de seguridad
docker/                      nginx y Caddy
```

Reglas:

- **Dependencias en una sola dirección:** `app → features → shared`. `shared` no conoce a nadie; entre _features_, solo a través de `index.ts` y sin ciclos (`admin` → `reports`/`settings`; `alarm` y `reports` → `sessions` → `settings`).
- **Lógica pura separada del estado:** `model.ts`, `schema.ts`, `stats.ts` y el calendario en `time.ts` no dependen de Svelte ni del navegador y tienen tests.
- **Sin duplicación:** límites en `shared/config`, colores por estado en `tone.ts`, textos de voz en `alarm/messages.ts`, y cabeceras de seguridad generadas desde un único archivo.

## Seguridad

**Autenticación y sesiones**

- Claves con **argon2id** (parámetros OWASP), con máximo 4 cálculos simultáneos para que una ráfaga de logins no agote la memoria.
- Sesión: token aleatorio de 256 bits en una cookie **HttpOnly, Secure, SameSite=Strict**, limitada a `/api`. JavaScript no puede leerla y en la base solo se guarda su hash SHA-256.
- **Cada petición** a la API valida el token contra la base: cerrar sesión, liberar el dispositivo, restablecer la clave o suspender la cuenta tiene efecto inmediato.
- Cambiar la clave cierra las demás sesiones. Las sesiones sin uso por 30 días vencen.
- Fuerza bruta: la cuenta se bloquea 15 minutos tras 5 intentos fallidos, y cada IP tiene un límite de 20 intentos cada 10 minutos. La IP real se toma solo de Cloudflare.
- No se revela si un usuario existe: mismo mensaje y mismo tiempo de respuesta.

**Peticiones entre sitios (CORS/CSRF)**

- La API no envía cabeceras CORS: ningún otro sitio puede leer sus respuestas.
- Toda modificación exige la cabecera `X-Requested-With: turnos` (un formulario de otro sitio no puede enviarla) además de la cookie SameSite=Strict.

**Autorización y datos**

- Cada cliente solo accede a sus datos: la API los busca por el usuario de la sesión, nunca por un id recibido.
- El panel exige rol de administrador en el servidor, y sus acciones no aplican sobre administradores. No existe forma de crear administradores desde la API.
- Entradas validadas en ambos lados: JSON estricto (campos desconocidos rechazados), tamaños máximos (16 KB y 2 MB para datos), usuarios con formato fijo, consultas SQL parametrizadas. La app valida también lo que llega del servidor y del almacenamiento local.

**Navegador y servidor**

- CSP estricta (solo mismo origen, sin scripts en línea), `frame-ancestors 'none'`, HSTS, `nosniff`, `Referrer-Policy` y `Permissions-Policy`. Las respuestas de la API son `no-store`.
- Contenedores sin privilegios, solo lectura, `cap_drop: ALL`, `no-new-privileges`. La API no está expuesta: solo se llega a ella por `/api`.
- Dependencias revisadas con `govulncheck` y `npm audit`; Go fijado en 1.26.8.

**Límites conocidos**

- La app funciona sin internet: quien manipule el almacenamiento de su celular podría seguir usando las funciones locales estando bloqueado, pero sin respaldo ni sincronización.
- Un atacante que conozca un usuario puede bloquearlo 15 minutos con intentos fallidos.

## Próximos pasos posibles

- Notificaciones push desde un backend (Go) para que suene con el celular bloqueado.
- Sincronizar varios celulares si atiende más de una persona.
