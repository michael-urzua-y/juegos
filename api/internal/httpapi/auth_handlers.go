package httpapi

import (
	"errors"
	"net/http"
	"strings"

	"github.com/michael-urzua-y/juegos/api/internal/auth"
	"github.com/michael-urzua-y/juegos/api/internal/store"
	"github.com/michael-urzua-y/juegos/api/internal/subscription"
)

type deviceView struct {
	Name       string `json:"name"`
	LastSeenAt int64  `json:"lastSeenAt"`
}

type userView struct {
	ID                 int64               `json:"id"`
	Username           string              `json:"username"`
	DisplayName        string              `json:"displayName"`
	Role               store.Role          `json:"role"`
	Status             subscription.Status `json:"status"`
	MustChangePassword bool                `json:"mustChangePassword"`
	Suspended          bool                `json:"suspended"`
	PaidUntil          string              `json:"paidUntil"`
	CreatedAt          int64               `json:"createdAt"`
	LastSeenAt         int64               `json:"lastSeenAt"`
	Device             *deviceView         `json:"device,omitempty"`
}

func (s *Server) view(u store.User, sess *store.Session) userView {
	v := userView{
		ID: u.ID, Username: u.Username, DisplayName: u.DisplayName, Role: u.Role, Status: s.status(u),
		MustChangePassword: u.MustChangePassword, Suspended: u.Suspended, PaidUntil: u.PaidUntil,
		CreatedAt: u.CreatedAt, LastSeenAt: u.LastSeenAt,
	}
	if sess != nil {
		v.Device = &deviceView{Name: sess.Device, LastSeenAt: sess.LastSeenAt}
	}
	return v
}

type meResponse struct {
	User           userView `json:"user"`
	SupportContact string   `json:"supportContact"`
	GraceDays      int      `json:"graceDays"`
}

func (s *Server) meResponse(u store.User) meResponse {
	return meResponse{User: s.view(u, nil), SupportContact: s.cfg.SupportContact, GraceDays: s.cfg.GraceDays}
}

func normalizeUsername(v string) string { return strings.ToLower(strings.TrimSpace(v)) }

// ---------- Login ----------

type loginRequest struct {
	Username string `json:"username"`
	Password string `json:"password"`
}

func (s *Server) login(w http.ResponseWriter, r *http.Request) {
	if !s.limiter.allow(clientIP(r), s.now()) {
		writeError(w, http.StatusTooManyRequests, "too_many_attempts", "Demasiados intentos. Espera unos minutos.")
		return
	}
	var req loginRequest
	if !decode(w, r, smallBody, &req) {
		return
	}
	ctx := r.Context()
	u, err := s.store.UserByUsername(ctx, normalizeUsername(req.Username))
	if isNotFound(err) {
		auth.VerifyDummy(req.Password) // mismo tiempo de respuesta exista o no el usuario
		writeError(w, http.StatusUnauthorized, "invalid_credentials", "Usuario o clave incorrectos.")
		return
	}
	if err != nil {
		s.internalError(w, r, err)
		return
	}
	if u.LockedUntil > s.now().UnixMilli() {
		writeError(w, http.StatusTooManyRequests, "locked", "Cuenta bloqueada por intentos fallidos. Espera 15 minutos.")
		return
	}
	if !auth.Verify(req.Password, u.PasswordHash) {
		if err := s.store.RecordLoginFailure(ctx, u.ID, maxLoginFails, lockDuration); err != nil {
			s.internalError(w, r, err)
			return
		}
		writeError(w, http.StatusUnauthorized, "invalid_credentials", "Usuario o clave incorrectos.")
		return
	}
	// Solo tras una clave correcta se informa el estado de la suscripción.
	if st := s.status(u); st != subscription.Active {
		writeJSON(w, http.StatusForbidden, map[string]string{
			"error": string(st), "message": blockedMessage(st), "paidUntil": u.PaidUntil, "supportContact": s.cfg.SupportContact,
		})
		return
	}
	token, tokenHash, err := auth.NewToken()
	if err != nil {
		s.internalError(w, r, err)
		return
	}
	singleDevice := u.Role == store.RoleClient
	other, err := s.store.CreateSession(ctx, tokenHash, u.ID, deviceName(r.UserAgent()), singleDevice, s.idleCutoff())
	if errors.Is(err, store.ErrActiveElsewhere) {
		writeJSON(w, http.StatusConflict, map[string]any{
			"error":          "active_elsewhere",
			"message":        "Tu cuenta ya está abierta en otro dispositivo.",
			"device":         deviceView{Name: other.Device, LastSeenAt: other.LastSeenAt},
			"supportContact": s.cfg.SupportContact,
		})
		return
	}
	if err != nil {
		s.internalError(w, r, err)
		return
	}
	if err := s.store.ResetLoginFailures(ctx, u.ID); err != nil {
		s.internalError(w, r, err)
		return
	}
	s.setCookie(w, token)
	writeJSON(w, http.StatusOK, s.meResponse(u))
}

// logout cierra la sesión de este dispositivo y lo libera para usar la cuenta en otro.
func (s *Server) logout(w http.ResponseWriter, r *http.Request) {
	if cookie, err := r.Cookie(cookieName); err == nil && cookie.Value != "" {
		if err := s.store.DeleteSession(r.Context(), auth.HashToken(cookie.Value)); err != nil {
			s.internalError(w, r, err)
			return
		}
	}
	s.clearCookie(w)
	w.WriteHeader(http.StatusNoContent)
}

func (s *Server) me(w http.ResponseWriter, _ *http.Request, u store.User) {
	writeJSON(w, http.StatusOK, s.meResponse(u))
}

// ---------- Cambio de clave ----------

type passwordRequest struct {
	CurrentPassword string `json:"currentPassword"`
	NewPassword     string `json:"newPassword"`
}

func (s *Server) changePassword(w http.ResponseWriter, r *http.Request, u store.User) {
	var req passwordRequest
	if !decode(w, r, smallBody, &req) {
		return
	}
	if !auth.Verify(req.CurrentPassword, u.PasswordHash) {
		writeError(w, http.StatusUnauthorized, "invalid_credentials", "La clave actual no es correcta.")
		return
	}
	if err := auth.ValidateNewPassword(req.NewPassword); err != nil {
		writeError(w, http.StatusBadRequest, "weak_password", "La nueva clave debe tener al menos 8 caracteres.")
		return
	}
	if req.NewPassword == req.CurrentPassword {
		writeError(w, http.StatusBadRequest, "same_password", "La nueva clave debe ser distinta a la actual.")
		return
	}
	hash, err := auth.Hash(req.NewPassword)
	if err != nil {
		s.internalError(w, r, err)
		return
	}
	ctx := r.Context()
	if err := s.store.SetPassword(ctx, u.ID, hash, false); err != nil {
		s.internalError(w, r, err)
		return
	}
	if err := s.store.DeleteOtherSessions(ctx, u.ID, ctx.Value(tokenKey).(string)); err != nil {
		s.internalError(w, r, err)
		return
	}
	u.MustChangePassword = false
	writeJSON(w, http.StatusOK, s.meResponse(u))
}
