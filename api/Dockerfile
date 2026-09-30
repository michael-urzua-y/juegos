# syntax=docker/dockerfile:1

# ---------- 1. Build: verifica y compila un binario estático ----------
FROM golang:1.26-alpine AS build
WORKDIR /src
COPY go.mod go.sum ./
RUN go mod download
COPY . .
# El build falla si fallan vet o los tests.
RUN go vet ./... && go test ./... \
 && CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" -o /out/server ./cmd/server \
 && mkdir -p /out/data

# ---------- 2. Runtime: sin shell ni paquetes, usuario sin privilegios ----------
FROM gcr.io/distroless/static-debian12:nonroot
COPY --from=build /out/server /server
# Carpeta de la base con dueño nonroot: el volumen nuevo hereda estos permisos.
COPY --from=build --chown=65532:65532 /out/data /data
ENV DB_PATH=/data/turnos.db BACKUP_DIR=/data/backups ADDR=:8081
EXPOSE 8081
VOLUME ["/data"]
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 CMD ["/server", "-healthcheck"]
ENTRYPOINT ["/server"]
