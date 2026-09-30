package httpapi

import (
	"bytes"
	"encoding/json"
	"net/http"

	"github.com/michael-urzua-y/juegos/api/internal/store"
)

// El documento de cada cliente: los mismos datos que la app guarda en el celular.
// La app vuelve a validar todo al cargarlo, igual que con lo leído de localStorage.
type appData struct {
	Sessions json.RawMessage `json:"sessions"`
	Archive  json.RawMessage `json:"archive"`
	Settings json.RawMessage `json:"settings"`
}

type dataResponse struct {
	Data      json.RawMessage `json:"data"`
	Version   int64           `json:"version"`
	UpdatedAt int64           `json:"updatedAt"`
}

func (s *Server) getData(w http.ResponseWriter, r *http.Request, u store.User) {
	d, err := s.store.GetData(r.Context(), u.ID)
	if isNotFound(err) {
		writeJSON(w, http.StatusOK, dataResponse{Data: json.RawMessage("null")})
		return
	}
	if err != nil {
		s.internalError(w, r, err)
		return
	}
	writeJSON(w, http.StatusOK, dataResponse{Data: json.RawMessage(d.JSON), Version: d.Version, UpdatedAt: d.UpdatedAt})
}

func (s *Server) putData(w http.ResponseWriter, r *http.Request, u store.User) {
	var req struct {
		Data appData `json:"data"`
	}
	if !decode(w, r, dataBody, &req) {
		return
	}
	d := req.Data
	if !isJSONKind(d.Sessions, '[') || !isJSONKind(d.Archive, '{') || !isJSONKind(d.Settings, '{') {
		writeError(w, http.StatusBadRequest, "bad_request", "Datos con formato inválido.")
		return
	}
	payload, err := json.Marshal(d)
	if err != nil {
		s.internalError(w, r, err)
		return
	}
	saved, err := s.store.PutData(r.Context(), u.ID, string(payload))
	if err != nil {
		s.internalError(w, r, err)
		return
	}
	writeJSON(w, http.StatusOK, dataResponse{Data: json.RawMessage("null"), Version: saved.Version, UpdatedAt: saved.UpdatedAt})
}

// isJSONKind comprueba que el valor sea un arreglo ('[') u objeto ('{').
func isJSONKind(raw json.RawMessage, open byte) bool {
	trimmed := bytes.TrimSpace(raw)
	return len(trimmed) > 0 && trimmed[0] == open
}
