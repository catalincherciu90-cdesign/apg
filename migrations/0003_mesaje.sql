-- Mesaje primite din formularul de contact
CREATE TABLE IF NOT EXISTS mesaje (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  nume       TEXT    NOT NULL,
  email      TEXT    NOT NULL,
  telefon    TEXT,
  mesaj      TEXT    NOT NULL,
  citit      INTEGER NOT NULL DEFAULT 0,
  created_at TEXT    NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_mesaje_citit ON mesaje(citit);
