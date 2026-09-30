// Package httpapi expone la API JSON bajo /api.
package httpapi

import (
	"context"
	"encoding/json"
	"errors"
	"log/slog"
	"net/http"
	"time"

	"github.com/michael-urzua-y/juegos/api/internal/config"
	"github.com/michael-urzua-y/juegos/api/internal/store"
	"github.com/michael-urzua-y/juegos/api/internal/subscription"
)

const (
	cookieName    = "turnos_session"
	csrfHeader    = "X-Requested-With"
	csrfValue     = "turnos"
	maxLoginFails = 5
	lockDuration  = 15 * time.Minute
	smallBody     = 16 << 10 // 16 KiB
	dataBody      = 2 << 20  // 2 MiB
)

type Server struct {
	store   *store.Store
	cfg     config.Config
	now     func() time.Time
	limiter *rateLimiter
	log     *slog.Logger
}

func New(st *store.Store, cfg config.Config, logger *slog.Logger) *Server {
	return &Server{
		store:   st,
		cfg:     cfg,
		now:     time.Now,
		limiter: newRateLimiter(20, 10*time.Minute),
		log:     logger,
	}
}

// WithClock fija la hora (tests).
func (s *Server) WithClock(now func() time.Time) *Server { s.now = now; return s }

func (s *Server) Handler() http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("GET /api/health", s.health)
	mux.HandleFunc("GET /api/config", s.publicConfig)

	mux.HandleFunc("POST /api/auth/login", s.login)
	mux.HandleFunc("POST /api/auth/logout", s.logout)
	mux.Handle("GET /api/me", s.authed(s.me, allowBlocked|allowMustChange))
	mux.Handle("POST /api/auth/password", s.authed(s.changePassword, allowBlocked|allowMustChange))

	mux.Handle("GET /api/data", s.authed(s.getData, 0))
	mux.Handle("PUT /api/data", s.authed(s.putData, 0))

	mux.Handle("GET /api/admin/users", s.admin(s.listUsers))
	mux.Handle("POST /api/admin/users", s.admin(s.createUser))
	mux.Handle("POST /api/admin/users/{id}/reset-password", s.admin(s.resetPassword))
	mux.Handle("POST /api/admin/users/{id}/suspend", s.admin(s.suspendUser))
	mux.Handle("POST /api/admin/users/{id}/payment", s.admin(s.registerPayment))
	mux.Handle("POST /api/admin/users/{id}/release", s.admin(s.releaseDevice))

	return s.recoverer(securityHeaders(csrf(mux)))
}

// ---------- Utilidades de tiempo y estado ----------

func (s *Server) today() string { return subscription.Date(s.now(), s.cfg.Location) }

// idleCutoff: las sesiones sin uso desde antes de este instante ya no cuentan.
func (s *Server) idleCutoff() int64 {
	return s.now().Add(-time.Duration(s.cfg.SessionIdleDays) * 24 * time.Hour).UnixMilli()
}

func (s *Server) status(u store.User) subscription.Status {
	return subscription.Compute(u.Role == store.RoleAdmin, u.Suspended, u.PaidUntil, s.today(), s.cfg.GraceDays)
}

// ---------- Respuestas JSON ----------

type apiError struct {
	Error   string `json:"error"`
	Message string `json:"message"`
}

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(v)
}

func writeError(w http.ResponseWriter, status int, code, message string) {
	writeJSON(w, status, apiError{Error: code, Message: message})
}

func (s *Server) internalError(w http.ResponseWriter, r *http.Request, err error) {
	s.log.Error("error interno", "path", r.URL.Path, "err", err)
	writeError(w, http.StatusInternalServerError, "internal", "Ocurrió un error. Intenta de nuevo.")
}

// decode lee un cuerpo JSON con tamaño máximo y sin campos desconocidos.
func decode(w http.ResponseWriter, r *http.Request, limit int64, v any) bool {
	r.Body = http.MaxBytesReader(w, r.Body, limit)
	dec := json.NewDecoder(r.Body)
	dec.DisallowUnknownFields()
	if err := dec.Decode(v); err != nil {
		writeError(w, http.StatusBadRequest, "bad_request", "Solicitud inválida.")
		return false
	}
	return true
}

func (s *Server) health(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 2*time.Second)
	defer cancel()
	if err := s.store.Ping(ctx); err != nil {
		writeError(w, http.StatusServiceUnavailable, "db", "Base de datos no disponible.")
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

func (s *Server) publicConfig(w http.ResponseWriter, _ *http.Request) {
	writeJSON(w, http.StatusOK, map[string]string{"supportContact": s.cfg.SupportContact})
}

func isNotFound(err error) bool { return errors.Is(err, store.ErrNotFound) }
