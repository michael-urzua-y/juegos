package httpapi

import (
	"context"
	"net"
	"net/http"
	"strings"
	"sync"
	"time"

	"github.com/michael-urzua-y/juegos/api/internal/auth"
	"github.com/michael-urzua-y/juegos/api/internal/store"
	"github.com/michael-urzua-y/juegos/api/internal/subscription"
)

type ctxKey int

const tokenKey ctxKey = iota

// Excepciones al control de acceso de authed.
const (
	allowBlocked    = 1 << iota // cliente suspendido o vencido (para ver su estado y cerrar sesión)
	allowMustChange             // clave temporal pendiente de cambio
)

// authed exige una sesión válida y, salvo excepciones, suscripción activa y clave definitiva.
func (s *Server) authed(h func(http.ResponseWriter, *http.Request, store.User), flags int) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		cookie, err := r.Cookie(cookieName)
		if err != nil || cookie.Value == "" {
			writeError(w, http.StatusUnauthorized, "unauthenticated", "Inicia sesión.")
			return
		}
		tokenHash := auth.HashToken(cookie.Value)
		u, err := s.store.UserBySession(r.Context(), tokenHash, s.idleCutoff())
		if isNotFound(err) {
			s.clearCookie(w)
			writeError(w, http.StatusUnauthorized, "unauthenticated", "Tu sesión terminó. Inicia sesión de nuevo.")
			return
		}
		if err != nil {
			s.internalError(w, r, err)
			return
		}
		if st := s.status(u); st != subscription.Active && flags&allowBlocked == 0 {
			writeError(w, http.StatusForbidden, string(st), blockedMessage(st))
			return
		}
		if u.MustChangePassword && flags&allowMustChange == 0 {
			writeError(w, http.StatusForbidden, "must_change_password", "Debes cambiar tu clave temporal.")
			return
		}
		h(w, r.WithContext(context.WithValue(r.Context(), tokenKey, tokenHash)), u)
	})
}

// admin exige además rol de administrador.
func (s *Server) admin(h func(http.ResponseWriter, *http.Request, store.User)) http.Handler {
	return s.authed(func(w http.ResponseWriter, r *http.Request, u store.User) {
		if u.Role != store.RoleAdmin {
			writeError(w, http.StatusForbidden, "forbidden", "No tienes permiso.")
			return
		}
		h(w, r, u)
	}, 0)
}

func blockedMessage(st subscription.Status) string {
	if st == subscription.Suspended {
		return "Tu cuenta está suspendida."
	}
	return "Tu suscripción venció."
}

// csrf: toda petición que modifica exige una cabecera propia. Un formulario o enlace de otro sitio
// no puede enviarla, y la cookie además es SameSite=Strict.
func csrf(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch r.Method {
		case http.MethodGet, http.MethodHead, http.MethodOptions:
		default:
			if r.Header.Get(csrfHeader) != csrfValue {
				writeError(w, http.StatusForbidden, "csrf", "Solicitud rechazada.")
				return
			}
		}
		next.ServeHTTP(w, r)
	})
}

func securityHeaders(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		h := w.Header()
		h.Set("Cache-Control", "no-store")
		h.Set("X-Content-Type-Options", "nosniff")
		h.Set("Referrer-Policy", "no-referrer")
		next.ServeHTTP(w, r)
	})
}

func (s *Server) recoverer(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		defer func() {
			if v := recover(); v != nil {
				s.log.Error("panic", "path", r.URL.Path, "value", v)
				writeError(w, http.StatusInternalServerError, "internal", "Ocurrió un error.")
			}
		}()
		next.ServeHTTP(w, r)
	})
}

// ---------- Cookie de sesión ----------

func (s *Server) setCookie(w http.ResponseWriter, token string) {
	http.SetCookie(w, &http.Cookie{
		Name:     cookieName,
		Value:    token,
		Path:     "/api",
		MaxAge:   int((365 * 24 * time.Hour).Seconds()), // el servidor decide cuándo vence por inactividad
		HttpOnly: true,
		Secure:   s.cfg.CookieSecure,
		SameSite: http.SameSiteStrictMode,
	})
}

func (s *Server) clearCookie(w http.ResponseWriter) {
	http.SetCookie(w, &http.Cookie{
		Name: cookieName, Value: "", Path: "/api", MaxAge: -1,
		HttpOnly: true, Secure: s.cfg.CookieSecure, SameSite: http.SameSiteStrictMode,
	})
}

// ---------- Límite de intentos por IP ----------

type rateLimiter struct {
	mu     sync.Mutex
	max    int
	window time.Duration
	hits   map[string][]time.Time
}

func newRateLimiter(max int, window time.Duration) *rateLimiter {
	return &rateLimiter{max: max, window: window, hits: map[string][]time.Time{}}
}

func (l *rateLimiter) allow(key string, now time.Time) bool {
	l.mu.Lock()
	defer l.mu.Unlock()
	from := now.Add(-l.window)
	recent := l.hits[key][:0]
	for _, t := range l.hits[key] {
		if t.After(from) {
			recent = append(recent, t)
		}
	}
	if len(recent) >= l.max {
		l.hits[key] = recent
		return false
	}
	l.hits[key] = append(recent, now)
	// Limpieza ocasional para que el mapa no crezca sin fin.
	if len(l.hits) > 10_000 {
		for k, v := range l.hits {
			if len(v) == 0 || v[len(v)-1].Before(from) {
				delete(l.hits, k)
			}
		}
	}
	return true
}

// clientIP devuelve la IP que fijó el proxy en X-Real-IP. No se lee CF-Connecting-IP: cualquiera
// que llegue al servidor sin pasar por Cloudflare podría inventarla. El nginx de entrada solo acepta
// la IP de Cloudflare si la petición viene de sus rangos (deploy/nginx/turnos.conf).
func clientIP(r *http.Request) string {
	if v := strings.TrimSpace(r.Header.Get("X-Real-IP")); v != "" {
		return v
	}
	host, _, err := net.SplitHostPort(r.RemoteAddr)
	if err != nil {
		return r.RemoteAddr
	}
	return host
}

// deviceName resume el User-Agent en algo legible para el panel: "Android · Chrome".
func deviceName(ua string) string {
	os := "Otro"
	for _, c := range []struct{ match, name string }{
		{"Android", "Android"}, {"iPhone", "iPhone"}, {"iPad", "iPad"},
		{"Windows", "Windows"}, {"Mac OS", "Mac"}, {"Linux", "Linux"},
	} {
		if strings.Contains(ua, c.match) {
			os = c.name
			break
		}
	}
	browser := "navegador"
	for _, c := range []struct{ match, name string }{
		{"Edg/", "Edge"}, {"SamsungBrowser", "Samsung Internet"}, {"Firefox/", "Firefox"},
		{"Chrome/", "Chrome"}, {"Safari/", "Safari"},
	} {
		if strings.Contains(ua, c.match) {
			browser = c.name
			break
		}
	}
	return os + " · " + browser
}
