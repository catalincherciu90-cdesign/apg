-- Recenzii / testimoniale clienți (gestionate din admin)
CREATE TABLE IF NOT EXISTS recenzii (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  nume       TEXT    NOT NULL,
  rating     INTEGER NOT NULL DEFAULT 5,
  text       TEXT    NOT NULL,
  activ      INTEGER NOT NULL DEFAULT 1,
  ordine     INTEGER NOT NULL DEFAULT 0,
  created_at TEXT    NOT NULL DEFAULT (datetime('now'))
);
