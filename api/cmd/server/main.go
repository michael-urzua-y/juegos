// Servidor de la API de Turnos Inflables: login, suscripciones y respaldo de datos en SQLite.
package main

import (
	"context"
	"errors"
	"flag"
	"fmt"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"path/filepath"
	"sort"
	"strings"
	"syscall"
	"time"

	"github.com/michael-urzua-y/juegos/api/internal/auth"
	"github.com/michael-urzua-y/juegos/api/internal/config"
	"github.com/michael-urzua-y/juegos/api/internal/db"
	"github.com/michael-urzua-y/juegos/api/internal/httpapi"
	"github.com/michael-urzua-y/juegos/api/internal/store"
)

func main() {
	healthcheck := flag.Bool("healthcheck", false, "consulta /api/health y termina (para Docker)")
	flag.Parse()
	log := slog.New(slog.NewJSONHandler(os.Stdout, nil))

	cfg, err := config.Load()
	if err != nil {
		log.Error("configuración", "err", err)
		os.Exit(1)
	}
	if *healthcheck {
		os.Exit(runHealthcheck(cfg.Addr))
	}
	if err := run(cfg, log); err != nil {
		log.Error("el servidor se detuvo", "err", err)
		os.Exit(1)
	}
}

func run(cfg config.Config, log *slog.Logger) error {
	database, err := db.Open(cfg.DBPath)
	if err != nil {
		return fmt.Errorf("abrir base: %w", err)
	}
	defer database.Close()
	st := store.New(database)

	ctx, stop := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer stop()

	if err := ensureAdmin(ctx, st, cfg, log); err != nil {
		return err
	}
	go maintenance(ctx, st, cfg, log)

	srv := &http.Server{
		Addr:              cfg.Addr,
		Handler:           httpapi.New(st, cfg, log).Handler(),
		ReadHeaderTimeout: 5 * time.Second,
		ReadTimeout:       15 * time.Second,
		WriteTimeout:      15 * time.Second,
		IdleTimeout:       60 * time.Second,
	}
	errs := make(chan error, 1)
	go func() { errs <- srv.ListenAndServe() }()
	log.Info("API escuchando", "addr", cfg.Addr, "db", cfg.DBPath)

	select {
	case err := <-errs:
		return err
	case <-ctx.Done():
	}
	shutdown, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	if err := srv.Shutdown(shutdown); err != nil && !errors.Is(err, http.ErrServerClosed) {
		return err
	}
	log.Info("API detenida")
	return nil
}

// ensureAdmin crea el primer administrador desde ADMIN_USERNAME/ADMIN_PASSWORD si no existe ninguno.
// Esa clave queda marcada como temporal: el primer ingreso obliga a cambiarla.
func ensureAdmin(ctx context.Context, st *store.Store, cfg config.Config, log *slog.Logger) error {
	n, err := st.CountAdmins(ctx)
	if err != nil || n > 0 {
		return err
	}
	username := strings.ToLower(strings.TrimSpace(cfg.AdminUsername))
	if username == "" || cfg.AdminPassword == "" {
		log.Warn("no hay administrador: define ADMIN_USERNAME y ADMIN_PASSWORD y reinicia")
		return nil
	}
	if err := auth.ValidateNewPassword(cfg.AdminPassword); err != nil {
		return fmt.Errorf("ADMIN_PASSWORD: %w", err)
	}
	hash, err := auth.Hash(cfg.AdminPassword)
	if err != nil {
		return err
	}
	_, err = st.CreateUser(ctx, store.User{
		Username: username, DisplayName: "Administrador", Role: store.RoleAdmin,
		PasswordHash: hash, MustChangePassword: true,
	})
	if err == nil {
		log.Info("administrador creado", "user", username)
	}
	return err
}

// maintenance limpia sesiones abandonadas y respalda la base una vez al día.
func maintenance(ctx context.Context, st *store.Store, cfg config.Config, log *slog.Logger) {
	ticker := time.NewTicker(time.Hour)
	defer ticker.Stop()
	for {
		cutoff := time.Now().Add(-time.Duration(cfg.SessionIdleDays) * 24 * time.Hour).UnixMilli()
		if err := st.PruneSessions(ctx, cutoff); err != nil && ctx.Err() == nil {
			log.Error("limpiar sesiones", "err", err)
		}
		if err := dailyBackup(ctx, st, cfg); err != nil && ctx.Err() == nil {
			log.Error("respaldo", "err", err)
		}
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
		}
	}
}

// dailyBackup deja un respaldo por día (turnos-AAAA-MM-DD.db) y borra los más antiguos.
func dailyBackup(ctx context.Context, st *store.Store, cfg config.Config) error {
	if err := os.MkdirAll(cfg.BackupDir, 0o750); err != nil {
		return err
	}
	name := filepath.Join(cfg.BackupDir, "turnos-"+time.Now().In(cfg.Location).Format("2006-01-02")+".db")
	if _, err := os.Stat(name); err == nil {
		return nil // ya existe el de hoy
	}
	if err := st.Backup(ctx, name); err != nil {
		return err
	}
	files, err := filepath.Glob(filepath.Join(cfg.BackupDir, "turnos-*.db"))
	if err != nil {
		return err
	}
	sort.Strings(files)
	for len(files) > cfg.BackupKeep {
		if err := os.Remove(files[0]); err != nil {
			return err
		}
		files = files[1:]
	}
	return nil
}

func runHealthcheck(addr string) int {
	host := addr
	if strings.HasPrefix(host, ":") {
		host = "127.0.0.1" + host
	}
	client := http.Client{Timeout: 3 * time.Second}
	res, err := client.Get("http://" + host + "/api/health")
	if err != nil {
		return 1
	}
	res.Body.Close()
	if res.StatusCode != http.StatusOK {
		return 1
	}
	return 0
}
