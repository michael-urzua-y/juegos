package auth

import (
	"strings"
	"testing"
)

func TestHashAndVerify(t *testing.T) {
	h, err := Hash("clave-segura-123")
	if err != nil {
		t.Fatal(err)
	}
	if !strings.HasPrefix(h, "$argon2id$v=19$") {
		t.Fatalf("formato inesperado: %s", h)
	}
	if !Verify("clave-segura-123", h) {
		t.Error("la clave correcta no verificó")
	}
	if Verify("clave-incorrecta", h) {
		t.Error("una clave incorrecta verificó")
	}
	if Verify("clave-segura-123", "basura") {
		t.Error("un hash inválido verificó")
	}
	h2, _ := Hash("clave-segura-123")
	if h == h2 {
		t.Error("dos hashes de la misma clave deben tener sal distinta")
	}
}

func TestTempPassword(t *testing.T) {
	seen := map[string]bool{}
	for range 50 {
		p, err := TempPassword()
		if err != nil {
			t.Fatal(err)
		}
		if len(p) != 10 || strings.ContainsAny(p, "0O1lI") {
			t.Fatalf("clave temporal inválida: %q", p)
		}
		if seen[p] {
			t.Fatalf("clave temporal repetida: %q", p)
		}
		seen[p] = true
	}
}

func TestValidateNewPassword(t *testing.T) {
	if ValidateNewPassword("corta") == nil {
		t.Error("aceptó una clave corta")
	}
	if ValidateNewPassword("suficiente") != nil {
		t.Error("rechazó una clave válida")
	}
}

func TestTokens(t *testing.T) {
	tok, hash, err := NewToken()
	if err != nil {
		t.Fatal(err)
	}
	if HashToken(tok) != hash || tok == hash {
		t.Error("el hash del token no coincide")
	}
}
