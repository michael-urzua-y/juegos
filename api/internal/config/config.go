// Package config lee la configuración desde variables de entorno.
package config

import (
	"fmt"
	"os"
	"strconv"
	"time"
	_ "time/tzdata" // zonas horarias embebidas: la imagen final no trae /usr/share/zoneinfo
)

type Config struct {
	Addr      string // dirección de escucha, p. ej. ":8081"
	DBPath    string // archivo SQLite
	BackupDir string // respaldos diarios de la base
	// Días de respaldo que se conservan.
	BackupKeep int
	// Cookie solo por HTTPS. Desactivar únicamente en desarrollo local por HTTP.
	CookieSecure bool
	// Días de gracia tras el vencimiento antes de bloquear al cliente.
	GraceDays int
	// Una sesión sin uso por esta cantidad de días se libera sola (celular perdido o reemplazado).
	SessionIdleDays int
	// Días de servicio con que parte un cliente nuevo.
	InitialDays int
	// Zona horaria para fechas de vencimiento y respaldos.
	Location *time.Location
	// Administrador inicial: se crea solo si todavía no hay ninguno.
	AdminUsername string
	AdminPassword string
	// Contacto que ven los clientes bloqueados (p. ej. número de WhatsApp).
	SupportContact string
}

func Load() (Config, error) {
	loc, err := time.LoadLocation(env("TZ", "America/Santiago"))
	if err != nil {
		return Config{}, fmt.Errorf("TZ inválida: %w", err)
	}
	c := Config{
		Addr:            env("ADDR", ":8081"),
		DBPath:          env("DB_PATH", "/data/turnos.db"),
		BackupDir:       env("BACKUP_DIR", "/data/backups"),
		BackupKeep:      envInt("BACKUP_KEEP", 14),
		CookieSecure:    env("COOKIE_SECURE", "true") != "false",
		GraceDays:       envInt("GRACE_DAYS", 3),
		SessionIdleDays: envInt("SESSION_IDLE_DAYS", 30),
		InitialDays:     envInt("INITIAL_DAYS", 30),
		Location:        loc,
		AdminUsername:   os.Getenv("ADMIN_USERNAME"),
		AdminPassword:   os.Getenv("ADMIN_PASSWORD"),
		SupportContact:  os.Getenv("SUPPORT_CONTACT"),
	}
	return c, nil
}

func env(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

func envInt(key string, fallback int) int {
	if v, err := strconv.Atoi(os.Getenv(key)); err == nil && v >= 0 {
		return v
	}
	return fallback
}
