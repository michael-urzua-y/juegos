# syntax=docker/dockerfile:1

# ---------- 1. Build: verifica y compila la PWA ----------
# Debian (glibc) en vez de Alpine: sharp, usado para generar los íconos, trae binarios listos.
FROM node:22-bookworm-slim AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

COPY . .
# El build falla si fallan los tipos o los tests.
RUN npm run check && npm test && npm run build

# ---------- 2. Runtime: nginx sin privilegios, solo archivos estáticos ----------
FROM nginxinc/nginx-unprivileged:1.29-alpine AS runtime

COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/.generated/security-headers.conf /etc/nginx/snippets/security-headers.conf
COPY --from=build /app/dist /usr/share/nginx/html

# La imagen corre como usuario sin privilegios (uid 101) en el puerto 8080.
USER 101
EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1:8080/healthz || exit 1
