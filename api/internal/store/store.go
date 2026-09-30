// Package store accede a la base: usuarios, sesiones, datos de la app y pagos.
package store

import (
	"context"
	"database/sql"
	"errors"
	"strings"
	"time"
)

var (
	ErrNotFound        = errors.New("no encontrado")
	ErrUsernameTaken   = errors.New("el usuario ya existe")
	ErrActiveElsewhere = errors.New("sesión activa en otro dispositivo")
)

type Role string

const (
	RoleAdmin  Role = "admin"
	RoleClient Role = "client"
)

type User struct {
	ID                 int64
	Username           string
	DisplayName        string
	Role               Role
	PasswordHash       string
	MustChangePassword bool
	Suspended          bool
	PaidUntil          string
	FailedLogins       int
	LockedUntil        int64
	CreatedAt          int64
	LastSeenAt         int64
}

// Session es un dispositivo con sesión abierta.
type Session struct {
	UserID     int64
	Device     string
	CreatedAt  int64
	LastSeenAt int64
}

// UserRow es un usuario con su sesión activa (si tiene), para el panel.
type UserRow struct {
	User
	Session *Session
}

type Store struct {
	db  *sql.DB
	now func() time.Time
}

func New(db *sql.DB) *Store { return &Store{db: db, now: time.Now} }

// WithClock permite fijar la hora en los tests.
func (s *Store) WithClock(now func() time.Time) *Store { s.now = now; return s }

func (s *Store) nowMs() int64 { return s.now().UnixMilli() }

// ---------- Usuarios ----------

// userColumns lista las columnas de users con el prefijo de tabla dado (p. ej. "u.").
func userColumns(p string) string {
	return p + `id, ` + p + `username, ` + p + `display_name, ` + p + `role, ` + p + `password_hash, ` +
		p + `must_change_password, ` + p + `suspended, COALESCE(` + p + `paid_until, ''), ` + p + `failed_logins, ` +
		p + `locked_until, ` + p + `created_at, COALESCE(` + p + `last_seen_at, 0)`
}

func scanUser(row interface{ Scan(...any) error }) (User, error) {
	var u User
	err := row.Scan(&u.ID, &u.Username, &u.DisplayName, &u.Role, &u.PasswordHash, &u.MustChangePassword,
		&u.Suspended, &u.PaidUntil, &u.FailedLogins, &u.LockedUntil, &u.CreatedAt, &u.LastSeenAt)
	if errors.Is(err, sql.ErrNoRows) {
		return u, ErrNotFound
	}
	return u, err
}

func (s *Store) CreateUser(ctx context.Context, u User) (User, error) {
	res, err := s.db.ExecContext(ctx, `INSERT INTO users
		(username, display_name, role, password_hash, must_change_password, paid_until, created_at)
		VALUES (?, ?, ?, ?, ?, NULLIF(?, ''), ?)`,
		u.Username, u.DisplayName, u.Role, u.PasswordHash, u.MustChangePassword, u.PaidUntil, s.nowMs())
	if err != nil {
		if strings.Contains(err.Error(), "UNIQUE") {
			return User{}, ErrUsernameTaken
		}
		return User{}, err
	}
	id, _ := res.LastInsertId()
	return s.UserByID(ctx, id)
}

func (s *Store) UserByID(ctx context.Context, id int64) (User, error) {
	return scanUser(s.db.QueryRowContext(ctx, `SELECT `+userColumns("")+` FROM users WHERE id = ?`, id))
}

func (s *Store) UserByUsername(ctx context.Context, username string) (User, error) {
	return scanUser(s.db.QueryRowContext(ctx, `SELECT `+userColumns("")+` FROM users WHERE username = ?`, username))
}

func (s *Store) CountAdmins(ctx context.Context) (int, error) {
	var n int
	err := s.db.QueryRowContext(ctx, `SELECT COUNT(*) FROM users WHERE role = 'admin'`).Scan(&n)
	return n, err
}

// ListUsers devuelve todos los usuarios con su dispositivo activo, clientes primero por nombre.
func (s *Store) ListUsers(ctx context.Context, idleCutoff int64) ([]UserRow, error) {
	rows, err := s.db.QueryContext(ctx, `SELECT `+userColumns("")+` FROM users ORDER BY role = 'admin', display_name COLLATE NOCASE`)
	if err != nil {
		return nil, err
	}
	var list []UserRow
	for rows.Next() {
		u, err := scanUser(rows)
		if err != nil {
			rows.Close()
			return nil, err
		}
		list = append(list, UserRow{User: u})
	}
	rows.Close()
	if err := rows.Err(); err != nil {
		return nil, err
	}
	for i := range list {
		sess, err := s.ActiveSession(ctx, list[i].ID, idleCutoff)
		if err != nil && !errors.Is(err, ErrNotFound) {
			return nil, err
		}
		if err == nil {
			list[i].Session = &sess
		}
	}
	return list, nil
}

func (s *Store) exec(ctx context.Context, query string, args ...any) error {
	res, err := s.db.ExecContext(ctx, query, args...)
	if err != nil {
		return err
	}
	if n, _ := res.RowsAffected(); n == 0 {
		return ErrNotFound
	}
	return nil
}

// RecordLoginFailure suma un intento fallido y bloquea el usuario por lockFor tras maxFails intentos.
func (s *Store) RecordLoginFailure(ctx context.Context, id int64, maxFails int, lockFor time.Duration) error {
	lockUntil := s.now().Add(lockFor).UnixMilli()
	return s.exec(ctx, `UPDATE users SET
		failed_logins = failed_logins + 1,
		locked_until = CASE WHEN failed_logins + 1 >= ? THEN ? ELSE locked_until END
		WHERE id = ?`, maxFails, lockUntil, id)
}

func (s *Store) ResetLoginFailures(ctx context.Context, id int64) error {
	return s.exec(ctx, `UPDATE users SET failed_logins = 0, locked_until = 0, last_seen_at = ? WHERE id = ?`, s.nowMs(), id)
}

// SetPassword cambia la clave. Con mustChange=true es una clave temporal (restablecida por el admin).
func (s *Store) SetPassword(ctx context.Context, id int64, hash string, mustChange bool) error {
	return s.exec(ctx, `UPDATE users SET password_hash = ?, must_change_password = ?, failed_logins = 0, locked_until = 0
		WHERE id = ?`, hash, mustChange, id)
}

func (s *Store) SetSuspended(ctx context.Context, id int64, suspended bool) error {
	return s.exec(ctx, `UPDATE users SET suspended = ? WHERE id = ?`, suspended, id)
}

// AddPayment registra un pago y deja el nuevo vencimiento.
func (s *Store) AddPayment(ctx context.Context, id int64, months int, paidUntil string) error {
	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()
	res, err := tx.ExecContext(ctx, `UPDATE users SET paid_until = ? WHERE id = ?`, paidUntil, id)
	if err != nil {
		return err
	}
	if n, _ := res.RowsAffected(); n == 0 {
		return ErrNotFound
	}
	if _, err := tx.ExecContext(ctx, `INSERT INTO payments (user_id, months, paid_until, created_at) VALUES (?, ?, ?, ?)`,
		id, months, paidUntil, s.nowMs()); err != nil {
		return err
	}
	return tx.Commit()
}

// ---------- Sesiones ----------

// ActiveSession devuelve la sesión más reciente usada después de idleCutoff.
func (s *Store) ActiveSession(ctx context.Context, userID, idleCutoff int64) (Session, error) {
	var sess Session
	err := s.db.QueryRowContext(ctx, `SELECT user_id, device, created_at, last_seen_at FROM sessions
		WHERE user_id = ? AND last_seen_at >= ? ORDER BY last_seen_at DESC LIMIT 1`, userID, idleCutoff).
		Scan(&sess.UserID, &sess.Device, &sess.CreatedAt, &sess.LastSeenAt)
	if errors.Is(err, sql.ErrNoRows) {
		return sess, ErrNotFound
	}
	return sess, err
}

// CreateSession abre una sesión. Con singleDevice, falla si el usuario ya tiene otra activa;
// las sesiones sin uso desde idleCutoff se descartan primero (celular perdido o reemplazado).
func (s *Store) CreateSession(ctx context.Context, tokenHash string, userID int64, device string,
	singleDevice bool, idleCutoff int64) (Session, error) {
	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return Session{}, err
	}
	defer tx.Rollback()
	if _, err := tx.ExecContext(ctx, `DELETE FROM sessions WHERE user_id = ? AND last_seen_at < ?`, userID, idleCutoff); err != nil {
		return Session{}, err
	}
	if singleDevice {
		var other Session
		err := tx.QueryRowContext(ctx, `SELECT user_id, device, created_at, last_seen_at FROM sessions
			WHERE user_id = ? ORDER BY last_seen_at DESC LIMIT 1`, userID).
			Scan(&other.UserID, &other.Device, &other.CreatedAt, &other.LastSeenAt)
		if err == nil {
			return other, ErrActiveElsewhere
		}
		if !errors.Is(err, sql.ErrNoRows) {
			return Session{}, err
		}
	}
	now := s.nowMs()
	if _, err := tx.ExecContext(ctx, `INSERT INTO sessions (token_hash, user_id, device, created_at, last_seen_at)
		VALUES (?, ?, ?, ?, ?)`, tokenHash, userID, device, now, now); err != nil {
		return Session{}, err
	}
	return Session{UserID: userID, Device: device, CreatedAt: now, LastSeenAt: now}, tx.Commit()
}

// UserBySession devuelve el dueño de un token vigente y marca la sesión como usada.
func (s *Store) UserBySession(ctx context.Context, tokenHash string, idleCutoff int64) (User, error) {
	now := s.nowMs()
	res, err := s.db.ExecContext(ctx, `UPDATE sessions SET last_seen_at = ? WHERE token_hash = ? AND last_seen_at >= ?`,
		now, tokenHash, idleCutoff)
	if err != nil {
		return User{}, err
	}
	if n, _ := res.RowsAffected(); n == 0 {
		return User{}, ErrNotFound
	}
	u, err := scanUser(s.db.QueryRowContext(ctx, `SELECT `+userColumns("u.")+`
		FROM users u JOIN sessions s ON s.user_id = u.id WHERE s.token_hash = ?`, tokenHash))
	if err != nil {
		return User{}, err
	}
	_, err = s.db.ExecContext(ctx, `UPDATE users SET last_seen_at = ? WHERE id = ?`, now, u.ID)
	return u, err
}

func (s *Store) DeleteSession(ctx context.Context, tokenHash string) error {
	_, err := s.db.ExecContext(ctx, `DELETE FROM sessions WHERE token_hash = ?`, tokenHash)
	return err
}

// DeleteUserSessions cierra todas las sesiones del usuario (libera su dispositivo).
func (s *Store) DeleteUserSessions(ctx context.Context, userID int64) error {
	_, err := s.db.ExecContext(ctx, `DELETE FROM sessions WHERE user_id = ?`, userID)
	return err
}

// DeleteOtherSessions deja solo la sesión actual (p. ej. tras cambiar la clave).
func (s *Store) DeleteOtherSessions(ctx context.Context, userID int64, keepTokenHash string) error {
	_, err := s.db.ExecContext(ctx, `DELETE FROM sessions WHERE user_id = ? AND token_hash <> ?`, userID, keepTokenHash)
	return err
}

func (s *Store) PruneSessions(ctx context.Context, idleCutoff int64) error {
	_, err := s.db.ExecContext(ctx, `DELETE FROM sessions WHERE last_seen_at < ?`, idleCutoff)
	return err
}

// ---------- Datos de la app ----------

type Data struct {
	JSON      string
	Version   int64
	UpdatedAt int64
}

func (s *Store) GetData(ctx context.Context, userID int64) (Data, error) {
	var d Data
	err := s.db.QueryRowContext(ctx, `SELECT data, version, updated_at FROM user_data WHERE user_id = ?`, userID).
		Scan(&d.JSON, &d.Version, &d.UpdatedAt)
	if errors.Is(err, sql.ErrNoRows) {
		return d, ErrNotFound
	}
	return d, err
}

// PutData guarda el documento del cliente y sube su versión.
func (s *Store) PutData(ctx context.Context, userID int64, json string) (Data, error) {
	now := s.nowMs()
	var version int64
	err := s.db.QueryRowContext(ctx, `INSERT INTO user_data (user_id, data, version, updated_at) VALUES (?, ?, 1, ?)
		ON CONFLICT (user_id) DO UPDATE SET data = excluded.data, version = version + 1, updated_at = excluded.updated_at
		RETURNING version`, userID, json, now).Scan(&version)
	return Data{JSON: json, Version: version, UpdatedAt: now}, err
}

// ---------- Mantenimiento ----------

// Backup copia la base completa y consistente a path (VACUUM INTO).
func (s *Store) Backup(ctx context.Context, path string) error {
	_, err := s.db.ExecContext(ctx, `VACUUM INTO ?`, path)
	return err
}

func (s *Store) Ping(ctx context.Context) error { return s.db.PingContext(ctx) }
