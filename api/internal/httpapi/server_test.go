package httpapi

import (
	"bytes"
	"context"
	"encoding/json"
	"io"
	"log/slog"
	"net/http"
	"net/http/cookiejar"
	"net/http/httptest"
	"path/filepath"
	"strings"
	"testing"
	"time"

	"github.com/michael-urzua-y/juegos/api/internal/auth"
	"github.com/michael-urzua-y/juegos/api/internal/config" // también embebe las zonas horarias
	"github.com/michael-urzua-y/juegos/api/internal/db"
	"github.com/michael-urzua-y/juegos/api/internal/store"
)

type env struct {
	t   *testing.T
	url string
	now *time.Time
}

func setup(t *testing.T) *env {
	t.Helper()
	loc, _ := time.LoadLocation("America/Santiago")
	now := time.Date(2026, 9, 30, 12, 0, 0, 0, loc)
	database, err := db.Open(filepath.Join(t.TempDir(), "test.db"))
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { database.Close() })
	clock := func() time.Time { return now }
	st := store.New(database).WithClock(clock)
	cfg := config.Config{GraceDays: 3, SessionIdleDays: 30, InitialDays: 30, Location: loc, SupportContact: "+56 9 1234 5678"}

	hash, _ := auth.Hash("admin-inicial")
	if _, err := st.CreateUser(context.Background(), store.User{
		Username: "admin", DisplayName: "Admin", Role: store.RoleAdmin, PasswordHash: hash, MustChangePassword: true,
	}); err != nil {
		t.Fatal(err)
	}
	logger := slog.New(slog.NewTextHandler(io.Discard, nil))
	ts := httptest.NewServer(New(st, cfg, logger).WithClock(clock).Handler())
	t.Cleanup(ts.Close)
	return &env{t: t, url: ts.URL, now: &now}
}

// device simula un celular: su propio frasco de cookies.
type device struct {
	e      *env
	client *http.Client
	ua     string
}

func (e *env) device(ua string) *device {
	jar, _ := cookiejar.New(nil)
	return &device{e: e, client: &http.Client{Jar: jar}, ua: ua}
}

func (d *device) do(method, path string, body any, csrf bool) (int, map[string]any) {
	d.e.t.Helper()
	var reader io.Reader
	if body != nil {
		b, _ := json.Marshal(body)
		reader = bytes.NewReader(b)
	}
	req, _ := http.NewRequest(method, d.e.url+path, reader)
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("User-Agent", d.ua)
	if csrf {
		req.Header.Set(csrfHeader, csrfValue)
	}
	res, err := d.client.Do(req)
	if err != nil {
		d.e.t.Fatal(err)
	}
	defer res.Body.Close()
	var out map[string]any
	_ = json.NewDecoder(res.Body).Decode(&out)
	return res.StatusCode, out
}

func (d *device) call(method, path string, body any) (int, map[string]any) {
	return d.do(method, path, body, true)
}

func (d *device) login(user, pass string) (int, map[string]any) {
	return d.call("POST", "/api/auth/login", map[string]string{"username": user, "password": pass})
}

func expect(t *testing.T, what string, got, want int, body map[string]any) {
	t.Helper()
	if got != want {
		t.Fatalf("%s: status %d, se esperaba %d (%v)", what, got, want, body)
	}
}

const android = "Mozilla/5.0 (Linux; Android 14) Chrome/130.0 Mobile Safari/537.36"
const iphone = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0) Version/18.0 Mobile/15E148 Safari/604.1"

// adminReady ingresa como admin y cambia su clave temporal.
func adminReady(e *env) *device {
	a := e.device("Mozilla/5.0 (Macintosh; Mac OS X) Chrome/130.0")
	code, body := a.login("admin", "admin-inicial")
	expect(e.t, "login admin", code, 200, body)
	code, body = a.call("GET", "/api/admin/users", nil)
	expect(e.t, "panel antes de cambiar clave", code, 403, body)
	code, body = a.call("POST", "/api/auth/password", map[string]string{"currentPassword": "admin-inicial", "newPassword": "admin-definitiva"})
	expect(e.t, "cambio de clave admin", code, 200, body)
	return a
}

func createClient(e *env, admin *device, username string) (id float64, temp string) {
	code, body := admin.call("POST", "/api/admin/users", map[string]string{"username": username, "displayName": "Juegos Pérez"})
	expect(e.t, "crear cliente", code, 201, body)
	user := body["user"].(map[string]any)
	return user["id"].(float64), body["tempPassword"].(string)
}

func TestClientLifecycle(t *testing.T) {
	e := setup(t)
	admin := adminReady(e)
	id, temp := createClient(e, admin, "Perez@Juegos.cl")

	// Primer ingreso con clave temporal: debe cambiarla antes de usar la app
	phone := e.device(android)
	code, body := phone.login("perez@juegos.cl", temp)
	expect(t, "login con clave temporal", code, 200, body)
	if !body["user"].(map[string]any)["mustChangePassword"].(bool) {
		t.Fatal("debería exigir cambio de clave")
	}
	code, body = phone.call("GET", "/api/data", nil)
	expect(t, "datos antes de cambiar clave", code, 403, body)
	code, body = phone.call("POST", "/api/auth/password", map[string]string{"currentPassword": temp, "newPassword": "corta"})
	expect(t, "clave débil", code, 400, body)
	code, body = phone.call("POST", "/api/auth/password", map[string]string{"currentPassword": temp, "newPassword": "mi-clave-nueva"})
	expect(t, "cambio de clave", code, 200, body)

	// Sincronización de datos
	code, body = phone.call("GET", "/api/data", nil)
	expect(t, "datos vacíos", code, 200, body)
	if body["data"] != nil {
		t.Fatalf("se esperaban datos vacíos: %v", body)
	}
	doc := map[string]any{"sessions": []any{map[string]any{"id": "a"}}, "archive": map[string]any{}, "settings": map[string]any{"volume": 0.9}}
	code, body = phone.call("PUT", "/api/data", map[string]any{"data": doc})
	expect(t, "guardar datos", code, 200, body)
	code, body = phone.call("PUT", "/api/data", map[string]any{"data": map[string]any{"sessions": "x", "archive": map[string]any{}, "settings": map[string]any{}}})
	expect(t, "datos con formato inválido", code, 400, body)
	code, body = phone.call("GET", "/api/data", nil)
	expect(t, "leer datos", code, 200, body)
	if body["version"].(float64) != 1 || len(body["data"].(map[string]any)["sessions"].([]any)) != 1 {
		t.Fatalf("datos no coinciden: %v", body)
	}

	// Un solo dispositivo: el segundo celular queda bloqueado
	other := e.device(iphone)
	code, body = other.login("perez@juegos.cl", "mi-clave-nueva")
	expect(t, "login en otro dispositivo", code, 409, body)
	if body["device"].(map[string]any)["name"] != "Android · Chrome" {
		t.Fatalf("debería informar el dispositivo activo: %v", body)
	}

	// El admin libera el dispositivo: el primero queda fuera y el segundo puede entrar
	code, body = admin.call("POST", "/api/admin/users/"+ftoa(id)+"/release", nil)
	expect(t, "liberar dispositivo", code, 200, body)
	code, body = phone.call("GET", "/api/me", nil)
	expect(t, "sesión liberada", code, 401, body)
	code, body = other.login("perez@juegos.cl", "mi-clave-nueva")
	expect(t, "login tras liberar", code, 200, body)

	// Cerrar sesión también libera
	code, _ = other.call("POST", "/api/auth/logout", nil)
	expect(t, "logout", code, 204, nil)
	code, body = phone.login("perez@juegos.cl", "mi-clave-nueva")
	expect(t, "login tras logout del otro", code, 200, body)

	// Suspensión manual: bloquea datos pero deja ver el estado
	code, body = admin.call("POST", "/api/admin/users/"+ftoa(id)+"/suspend", map[string]bool{"suspended": true})
	expect(t, "suspender", code, 200, body)
	code, body = phone.call("GET", "/api/data", nil)
	expect(t, "datos suspendido", code, 403, body)
	if body["error"] != "suspended" {
		t.Fatalf("error esperado suspended: %v", body)
	}
	code, body = phone.call("GET", "/api/me", nil)
	expect(t, "me suspendido", code, 200, body)
	code, body = admin.call("POST", "/api/admin/users/"+ftoa(id)+"/suspend", map[string]bool{"suspended": false})
	expect(t, "habilitar", code, 200, body)

	// Vencimiento automático: 30 días iniciales + 3 de gracia (el celular se usa entremedio)
	*e.now = e.now.AddDate(0, 0, 20)
	code, body = phone.call("GET", "/api/data", nil)
	expect(t, "datos a los 20 días", code, 200, body)
	admin.call("GET", "/api/admin/users", nil)
	*e.now = e.now.AddDate(0, 0, 14)
	code, body = phone.call("GET", "/api/data", nil)
	expect(t, "datos vencido", code, 403, body)
	if body["error"] != "expired" {
		t.Fatalf("error esperado expired: %v", body)
	}
	// Registrar pago lo reactiva desde hoy
	code, body = admin.call("POST", "/api/admin/users/"+ftoa(id)+"/payment", map[string]int{"months": 1})
	expect(t, "registrar pago", code, 200, body)
	if got := body["user"].(map[string]any)["paidUntil"]; got != "2026-12-03" {
		t.Fatalf("vencimiento tras pago: %v", got)
	}
	code, body = phone.call("GET", "/api/data", nil)
	expect(t, "datos tras pago", code, 200, body)

	// Restablecer clave: cierra la sesión y exige cambiarla de nuevo
	code, body = admin.call("POST", "/api/admin/users/"+ftoa(id)+"/reset-password", nil)
	expect(t, "restablecer clave", code, 200, body)
	newTemp := body["tempPassword"].(string)
	code, _ = phone.call("GET", "/api/me", nil)
	expect(t, "sesión cerrada tras restablecer", code, 401, nil)
	code, body = phone.login("perez@juegos.cl", newTemp)
	expect(t, "login con nueva temporal", code, 200, body)
	if !body["user"].(map[string]any)["mustChangePassword"].(bool) {
		t.Fatal("debería exigir cambio tras restablecer")
	}

	// El panel lista al cliente con su dispositivo
	code, body = admin.call("GET", "/api/admin/users", nil)
	expect(t, "listar", code, 200, body)
	users := body["users"].([]any)
	if len(users) != 2 || users[0].(map[string]any)["device"] == nil {
		t.Fatalf("lista inesperada: %v", users)
	}
}

func TestSecurity(t *testing.T) {
	e := setup(t)
	admin := adminReady(e)
	_, temp := createClient(e, admin, "cliente")

	// Sin la cabecera anti-CSRF no se acepta ninguna modificación
	d := e.device(android)
	code, body := d.do("POST", "/api/auth/login", map[string]string{"username": "cliente", "password": temp}, false)
	expect(t, "login sin cabecera", code, 403, body)

	// Un cliente no puede usar el panel
	code, _ = d.login("cliente", temp)
	expect(t, "login cliente", code, 200, nil)
	d.call("POST", "/api/auth/password", map[string]string{"currentPassword": temp, "newPassword": "clave-del-cliente"})
	code, body = d.call("GET", "/api/admin/users", nil)
	expect(t, "cliente en panel", code, 403, body)

	// No hay diferencia entre usuario inexistente y clave incorrecta
	x := e.device(android)
	c1, b1 := x.login("no-existe", "loquesea123")
	c2, b2 := x.login("cliente", "incorrecta123")
	if c1 != 401 || c2 != 401 || b1["message"] != b2["message"] {
		t.Fatalf("respuestas distintas: %v %v", b1, b2)
	}

	// 5 intentos fallidos bloquean la cuenta aunque luego se use la clave correcta
	for range 4 {
		x.login("cliente", "incorrecta123")
	}
	code, body = x.login("cliente", "clave-del-cliente")
	expect(t, "cuenta bloqueada", code, 429, body)
	*e.now = e.now.Add(16 * time.Minute)
	code, body = e.device(iphone).login("cliente", "clave-del-cliente")
	// Desbloqueada, pero el celular original sigue con la sesión activa
	expect(t, "tras el bloqueo", code, 409, body)

	// Una sesión abandonada 30 días se libera sola
	*e.now = e.now.AddDate(0, 0, 31)
	admin2 := e.device("Mac OS Chrome/1")
	admin2.login("admin", "admin-definitiva")
	admin2.call("POST", "/api/admin/users/2/payment", map[string]int{"months": 3})
	code, body = e.device(iphone).login("cliente", "clave-del-cliente")
	expect(t, "sesión abandonada liberada", code, 200, body)

	// Cookie segura
	res, _ := http.Post(e.url+"/api/auth/logout", "application/json", strings.NewReader("{}"))
	res.Body.Close()
	expect(t, "logout sin cabecera", res.StatusCode, 403, nil)
}

func TestUsernameValidation(t *testing.T) {
	e := setup(t)
	admin := adminReady(e)
	code, body := admin.call("POST", "/api/admin/users", map[string]string{"username": "a b", "displayName": "X"})
	expect(t, "usuario con espacio", code, 400, body)
	createClient(e, admin, "repetido")
	code, body = admin.call("POST", "/api/admin/users", map[string]string{"username": "REPETIDO", "displayName": "X"})
	expect(t, "usuario repetido", code, 409, body)
}

func ftoa(f float64) string {
	return strings.TrimSuffix(strings.TrimRight(json.Number(jsonNum(f)).String(), "0"), ".")
}

func jsonNum(f float64) string { b, _ := json.Marshal(f); return string(b) }

func TestClientIPIgnoresSpoofableHeaders(t *testing.T) {
	r := httptest.NewRequest("POST", "/api/auth/login", nil)
	r.RemoteAddr = "10.0.0.5:4321"
	r.Header.Set("CF-Connecting-IP", "1.2.3.4")
	if got := clientIP(r); got != "10.0.0.5" {
		t.Fatalf("no debe confiar en CF-Connecting-IP: %s", got)
	}
	r.Header.Set("X-Real-IP", "200.1.1.1")
	if got := clientIP(r); got != "200.1.1.1" {
		t.Fatalf("debe usar la IP fijada por el proxy: %s", got)
	}
}
