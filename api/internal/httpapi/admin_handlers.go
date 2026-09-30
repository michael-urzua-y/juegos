package httpapi

import (
	"errors"
	"net/http"
	"regexp"
	"strconv"
	"strings"
	"unicode"
	"unicode/utf8"

	"github.com/michael-urzua-y/juegos/api/internal/auth"
	"github.com/michael-urzua-y/juegos/api/internal/store"
	"github.com/michael-urzua-y/juegos/api/internal/subscription"
)

var usernamePattern = regexp.MustCompile(`^[a-z0-9._@-]{3,40}$`)

func cleanName(v string) string {
	v = strings.Map(func(r rune) rune {
		if unicode.IsControl(r) || unicode.Is(unicode.Bidi_Control, r) {
			return -1
		}
		return r
	}, v)
	return strings.Join(strings.Fields(v), " ")
}

func (s *Server) listUsers(w http.ResponseWriter, r *http.Request, _ store.User) {
	rows, err := s.store.ListUsers(r.Context(), s.idleCutoff())
	if err != nil {
		s.internalError(w, r, err)
		return
	}
	users := make([]userView, 0, len(rows))
	for _, row := range rows {
		users = append(users, s.view(row.User, row.Session))
	}
	writeJSON(w, http.StatusOK, map[string]any{"users": users, "today": s.today(), "graceDays": s.cfg.GraceDays})
}

type createUserRequest struct {
	Username    string `json:"username"`
	DisplayName string `json:"displayName"`
}

// createUser crea un cliente con clave temporal y los días iniciales de servicio.
func (s *Server) createUser(w http.ResponseWriter, r *http.Request, _ store.User) {
	var req createUserRequest
	if !decode(w, r, smallBody, &req) {
		return
	}
	username := normalizeUsername(req.Username)
	name := cleanName(req.DisplayName)
	if !usernamePattern.MatchString(username) {
		writeError(w, http.StatusBadRequest, "invalid_username",
			"El usuario debe tener entre 3 y 40 caracteres: letras minúsculas, números, punto, guion o @.")
		return
	}
	if n := utf8.RuneCountInString(name); n < 1 || n > 60 {
		writeError(w, http.StatusBadRequest, "invalid_name", "El nombre debe tener entre 1 y 60 caracteres.")
		return
	}
	temp, hash, ok := s.newTempPassword(w, r)
	if !ok {
		return
	}
	u, err := s.store.CreateUser(r.Context(), store.User{
		Username: username, DisplayName: name, Role: store.RoleClient, PasswordHash: hash,
		MustChangePassword: true, PaidUntil: subscription.AddDays(s.today(), s.cfg.InitialDays),
	})
	if errors.Is(err, store.ErrUsernameTaken) {
		writeError(w, http.StatusConflict, "username_taken", "Ese usuario ya existe.")
		return
	}
	if err != nil {
		s.internalError(w, r, err)
		return
	}
	s.log.Info("cliente creado", "user", u.Username)
	writeJSON(w, http.StatusCreated, map[string]any{"user": s.view(u, nil), "tempPassword": temp})
}

func (s *Server) newTempPassword(w http.ResponseWriter, r *http.Request) (temp, hash string, ok bool) {
	temp, err := auth.TempPassword()
	if err == nil {
		hash, err = auth.Hash(temp)
	}
	if err != nil {
		s.internalError(w, r, err)
		return "", "", false
	}
	return temp, hash, true
}

// client obtiene el cliente del parámetro {id}. Las acciones del panel no aplican a administradores.
func (s *Server) client(w http.ResponseWriter, r *http.Request) (store.User, bool) {
	id, err := strconv.ParseInt(r.PathValue("id"), 10, 64)
	if err != nil {
		writeError(w, http.StatusNotFound, "not_found", "Cliente no encontrado.")
		return store.User{}, false
	}
	u, err := s.store.UserByID(r.Context(), id)
	if isNotFound(err) || (err == nil && u.Role != store.RoleClient) {
		writeError(w, http.StatusNotFound, "not_found", "Cliente no encontrado.")
		return store.User{}, false
	}
	if err != nil {
		s.internalError(w, r, err)
		return store.User{}, false
	}
	return u, true
}

// respondClient devuelve el cliente actualizado con su dispositivo activo.
func (s *Server) respondClient(w http.ResponseWriter, r *http.Request, id int64, extra map[string]any) {
	u, err := s.store.UserByID(r.Context(), id)
	if err != nil {
		s.internalError(w, r, err)
		return
	}
	var sess *store.Session
	if active, err := s.store.ActiveSession(r.Context(), id, s.idleCutoff()); err == nil {
		sess = &active
	}
	body := map[string]any{"user": s.view(u, sess)}
	for k, v := range extra {
		body[k] = v
	}
	writeJSON(w, http.StatusOK, body)
}

// resetPassword entrega una clave temporal nueva y cierra la sesión del cliente.
func (s *Server) resetPassword(w http.ResponseWriter, r *http.Request, _ store.User) {
	u, ok := s.client(w, r)
	if !ok {
		return
	}
	temp, hash, ok := s.newTempPassword(w, r)
	if !ok {
		return
	}
	if err := s.store.SetPassword(r.Context(), u.ID, hash, true); err != nil {
		s.internalError(w, r, err)
		return
	}
	if err := s.store.DeleteUserSessions(r.Context(), u.ID); err != nil {
		s.internalError(w, r, err)
		return
	}
	s.log.Info("clave restablecida", "user", u.Username)
	s.respondClient(w, r, u.ID, map[string]any{"tempPassword": temp})
}

func (s *Server) suspendUser(w http.ResponseWriter, r *http.Request, _ store.User) {
	u, ok := s.client(w, r)
	if !ok {
		return
	}
	var req struct {
		Suspended bool `json:"suspended"`
	}
	if !decode(w, r, smallBody, &req) {
		return
	}
	if err := s.store.SetSuspended(r.Context(), u.ID, req.Suspended); err != nil {
		s.internalError(w, r, err)
		return
	}
	s.log.Info("suspensión", "user", u.Username, "suspended", req.Suspended)
	s.respondClient(w, r, u.ID, nil)
}

func (s *Server) registerPayment(w http.ResponseWriter, r *http.Request, _ store.User) {
	u, ok := s.client(w, r)
	if !ok {
		return
	}
	var req struct {
		Months int `json:"months"`
	}
	if !decode(w, r, smallBody, &req) {
		return
	}
	if req.Months < 1 || req.Months > 12 {
		writeError(w, http.StatusBadRequest, "invalid_months", "Indica entre 1 y 12 meses.")
		return
	}
	until := subscription.Extend(u.PaidUntil, s.today(), req.Months)
	if err := s.store.AddPayment(r.Context(), u.ID, req.Months, until); err != nil {
		s.internalError(w, r, err)
		return
	}
	s.log.Info("pago registrado", "user", u.Username, "months", req.Months, "until", until)
	s.respondClient(w, r, u.ID, nil)
}

// releaseDevice cierra la sesión del cliente para que pueda entrar desde otro dispositivo.
func (s *Server) releaseDevice(w http.ResponseWriter, r *http.Request, _ store.User) {
	u, ok := s.client(w, r)
	if !ok {
		return
	}
	if err := s.store.DeleteUserSessions(r.Context(), u.ID); err != nil {
		s.internalError(w, r, err)
		return
	}
	s.log.Info("dispositivo liberado", "user", u.Username)
	s.respondClient(w, r, u.ID, nil)
}
