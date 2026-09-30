// Package auth maneja claves (argon2id), claves temporales y tokens de sesión.
package auth

import (
	"crypto/rand"
	"crypto/sha256"
	"crypto/subtle"
	"encoding/base64"
	"encoding/hex"
	"fmt"
	"strings"
	"unicode/utf8"

	"golang.org/x/crypto/argon2"
)

// Parámetros recomendados por OWASP para argon2id.
const (
	argonMemory  = 19 * 1024 // KiB
	argonTime    = 2
	argonThreads = 1
	argonKeyLen  = 32
	saltLen      = 16

	MinPasswordLen = 8
	MaxPasswordLen = 128
)

// Cada cálculo de argon2id usa ~19 MiB. Limitar los simultáneos evita que una ráfaga de
// intentos de login agote la memoria del servidor; el resto espera su turno.
var argonSlots = make(chan struct{}, 4)

func idKey(password, salt []byte, time, memory uint32, threads uint8, keyLen uint32) []byte {
	argonSlots <- struct{}{}
	defer func() { <-argonSlots }()
	return argon2.IDKey(password, salt, time, memory, threads, keyLen)
}

var ErrWeakPassword = fmt.Errorf("la clave debe tener entre %d y %d caracteres", MinPasswordLen, MaxPasswordLen)

// Hash devuelve la clave cifrada en formato PHC: $argon2id$v=19$m=...,t=...,p=...$sal$hash
func Hash(password string) (string, error) {
	salt := make([]byte, saltLen)
	if _, err := rand.Read(salt); err != nil {
		return "", err
	}
	key := idKey([]byte(password), salt, argonTime, argonMemory, argonThreads, argonKeyLen)
	b64 := base64.RawStdEncoding
	return fmt.Sprintf("$argon2id$v=%d$m=%d,t=%d,p=%d$%s$%s",
		argon2.Version, argonMemory, argonTime, argonThreads, b64.EncodeToString(salt), b64.EncodeToString(key)), nil
}

// Verify compara en tiempo constante una clave con su hash.
func Verify(password, encoded string) bool {
	parts := strings.Split(encoded, "$")
	if len(parts) != 6 || parts[1] != "argon2id" {
		return false
	}
	var memory, time uint32
	var threads uint8
	if _, err := fmt.Sscanf(parts[3], "m=%d,t=%d,p=%d", &memory, &time, &threads); err != nil {
		return false
	}
	b64 := base64.RawStdEncoding
	salt, err1 := b64.DecodeString(parts[4])
	want, err2 := b64.DecodeString(parts[5])
	if err1 != nil || err2 != nil {
		return false
	}
	got := idKey([]byte(password), salt, time, memory, threads, uint32(len(want)))
	return subtle.ConstantTimeCompare(got, want) == 1
}

// dummyHash se usa cuando el usuario no existe, para que la respuesta tarde lo mismo
// y no revele qué usuarios están registrados.
var dummyHash, _ = Hash("usuario-inexistente")

func VerifyDummy(password string) { Verify(password, dummyHash) }

func ValidateNewPassword(password string) error {
	if n := utf8.RuneCountInString(password); n < MinPasswordLen || n > MaxPasswordLen {
		return ErrWeakPassword
	}
	return nil
}

// Sin caracteres que se confunden al dictarlos o leerlos (0/O, 1/l/I).
const tempAlphabet = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789"

// TempPassword genera una clave temporal legible de 10 caracteres.
func TempPassword() (string, error) {
	return randomString(tempAlphabet, 10)
}

func randomString(alphabet string, n int) (string, error) {
	buf := make([]byte, n)
	if _, err := rand.Read(buf); err != nil {
		return "", err
	}
	out := make([]byte, n)
	for i, b := range buf {
		out[i] = alphabet[int(b)%len(alphabet)]
	}
	return string(out), nil
}

// NewToken devuelve un token de sesión aleatorio (va en la cookie) y su hash (va en la base).
func NewToken() (token, hash string, err error) {
	raw := make([]byte, 32)
	if _, err := rand.Read(raw); err != nil {
		return "", "", err
	}
	token = base64.RawURLEncoding.EncodeToString(raw)
	return token, HashToken(token), nil
}

func HashToken(token string) string {
	sum := sha256.Sum256([]byte(token))
	return hex.EncodeToString(sum[:])
}
