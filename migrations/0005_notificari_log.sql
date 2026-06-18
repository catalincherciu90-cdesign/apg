-- Jurnal notificări email (audit: cui, când, succes/eșec)
CREATE TABLE IF NOT EXISTS notificari_log (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  tip        TEXT    NOT NULL,
  destinatar TEXT    NOT NULL,
  subiect    TEXT    NOT NULL,
  status     TEXT    NOT NULL,           -- 'trimis' | 'esuat' | 'dezactivat'
  eroare     TEXT,
  created_at TEXT    NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_notificari_log_created ON notificari_log(created_at);
