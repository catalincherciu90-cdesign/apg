-- APG Garage — schema D1 (SQLite)
-- Port din MySQL `servis_auto`. Reconstruita din interogarile aplicatiei PHP.

-- Utilizatori (clienti + angajati)
CREATE TABLE IF NOT EXISTS users (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  nume       TEXT    NOT NULL,
  email      TEXT    NOT NULL UNIQUE,
  parola     TEXT    NOT NULL,                 -- hash bcrypt
  telefon    TEXT,
  rol        TEXT    NOT NULL DEFAULT 'client', -- 'client' | 'angajat'
  permisiuni TEXT,                              -- JSON array, doar pentru angajati
  created_at TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- Masinile clientilor
CREATE TABLE IF NOT EXISTS masini (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id             INTEGER NOT NULL,
  nr_inmatriculare    TEXT    NOT NULL,
  producator          TEXT    NOT NULL,
  model               TEXT    NOT NULL,
  serie_caroserie     TEXT,
  data_ultima_revizie TEXT,                     -- YYYY-MM-DD
  notificare_trimisa  INTEGER NOT NULL DEFAULT 0,
  created_at          TEXT    NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_masini_user ON masini(user_id);

-- Programari (rezervari service)
CREATE TABLE IF NOT EXISTS rezervari (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id          INTEGER NOT NULL,
  nr_inmatriculare TEXT,
  producator       TEXT,
  model            TEXT,
  serviciu_tip     TEXT    NOT NULL,            -- revizie | reparatie | verificare_rampa
  descriere        TEXT,
  data             TEXT    NOT NULL,            -- YYYY-MM-DD
  ora_start        TEXT    NOT NULL,            -- HH:MM:SS
  durata           INTEGER NOT NULL,            -- ore (2 | 4)
  status           TEXT    NOT NULL DEFAULT 'asteptare', -- asteptare|confirmat|respins|in_lucru|finalizat
  motiv_respingere TEXT,
  created_at       TEXT    NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_rezervari_user ON rezervari(user_id);
CREATE INDEX IF NOT EXISTS idx_rezervari_data ON rezervari(data);

-- Devize emise pentru o programare
CREATE TABLE IF NOT EXISTS devize (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  rezervare_id INTEGER NOT NULL,
  observatii   TEXT,
  status       TEXT    NOT NULL DEFAULT 'draft', -- draft | trimis
  created_at   TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at   TEXT    NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_devize_rezervare ON devize(rezervare_id);

-- Randuri deviz (piese + manopera)
CREATE TABLE IF NOT EXISTS deviz_randuri (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  deviz_id    INTEGER NOT NULL,
  tip         TEXT    NOT NULL,                 -- piesa | manopera
  categorie   TEXT,
  nume        TEXT    NOT NULL,
  cantitate   REAL    NOT NULL DEFAULT 1,
  pret_unitar REAL    NOT NULL DEFAULT 0,
  total       REAL    NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_randuri_deviz ON deviz_randuri(deviz_id);

-- Servicii afisate public
CREATE TABLE IF NOT EXISTS servicii (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  nume        TEXT    NOT NULL,
  descriere   TEXT,
  durata_ore  REAL,
  ordine      INTEGER NOT NULL DEFAULT 0,
  activ       INTEGER NOT NULL DEFAULT 1,
  created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- Lista de preturi
CREATE TABLE IF NOT EXISTS preturi (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  categorie     TEXT,
  nume          TEXT    NOT NULL,
  pret_de_la    REAL,
  include_piese INTEGER NOT NULL DEFAULT 0,
  nota          TEXT,
  ordine        INTEGER NOT NULL DEFAULT 0,
  activ         INTEGER NOT NULL DEFAULT 1,
  created_at    TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- Cereri de tractare
CREATE TABLE IF NOT EXISTS tractari (
  id                 INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id            INTEGER,
  nume               TEXT    NOT NULL,
  telefon            TEXT    NOT NULL,
  locatie            TEXT,
  nr_inmatriculare   TEXT,
  producator         TEXT,
  model              TEXT,
  descriere_problema TEXT,
  status             TEXT    NOT NULL DEFAULT 'asteptare',
  created_at         TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- Masini la dezmembrare
CREATE TABLE IF NOT EXISTS dezmembrari (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  producator    TEXT    NOT NULL,
  model         TEXT    NOT NULL,
  an_fabricatie INTEGER,
  motorizare    TEXT,
  descriere     TEXT,
  activ         INTEGER NOT NULL DEFAULT 1,
  created_at    TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- Cereri de piese pentru o masina dezmembrata
CREATE TABLE IF NOT EXISTS cereri_piese (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id        INTEGER,
  dezmembrare_id INTEGER,
  nume           TEXT    NOT NULL,
  telefon        TEXT    NOT NULL,
  piesa_dorita   TEXT    NOT NULL,
  status         TEXT    NOT NULL DEFAULT 'asteptare',
  raspuns_admin  TEXT,
  created_at     TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- Zile blocate (fara programari)
CREATE TABLE IF NOT EXISTS zile_blocate (
  id    INTEGER PRIMARY KEY AUTOINCREMENT,
  data  TEXT NOT NULL UNIQUE,                   -- YYYY-MM-DD
  motiv TEXT
);

-- Setari site (continut editabil) — key/value
CREATE TABLE IF NOT EXISTS setari (
  cheie   TEXT PRIMARY KEY,
  valoare TEXT
);
