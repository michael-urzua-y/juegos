-- Fechas y horas en milisegundos Unix; vencimientos como 'AAAA-MM-DD' (hora de Chile).

CREATE TABLE users (
  id                   INTEGER PRIMARY KEY,
  username             TEXT    NOT NULL UNIQUE COLLATE NOCASE,
  display_name         TEXT    NOT NULL,
  role                 TEXT    NOT NULL DEFAULT 'client' CHECK (role IN ('admin', 'client')),
  password_hash        TEXT    NOT NULL,
  must_change_password INTEGER NOT NULL DEFAULT 1,
  suspended            INTEGER NOT NULL DEFAULT 0,
  paid_until           TEXT,
  failed_logins        INTEGER NOT NULL DEFAULT 0,
  locked_until         INTEGER NOT NULL DEFAULT 0,
  created_at           INTEGER NOT NULL,
  last_seen_at         INTEGER
);

-- Una fila por dispositivo con sesión abierta. El token se guarda solo como hash.
CREATE TABLE sessions (
  token_hash   TEXT    PRIMARY KEY,
  user_id      INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  device       TEXT    NOT NULL,
  created_at   INTEGER NOT NULL,
  last_seen_at INTEGER NOT NULL
);
CREATE INDEX sessions_user ON sessions (user_id);

-- Datos de la app de cada cliente (turnos, caja y ajustes) como un documento JSON.
CREATE TABLE user_data (
  user_id    INTEGER PRIMARY KEY REFERENCES users (id) ON DELETE CASCADE,
  data       TEXT    NOT NULL,
  version    INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

-- Historial de pagos registrados desde el panel.
CREATE TABLE payments (
  id         INTEGER PRIMARY KEY,
  user_id    INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  months     INTEGER NOT NULL,
  paid_until TEXT    NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE INDEX payments_user ON payments (user_id);
