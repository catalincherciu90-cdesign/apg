import type { Env } from '../types';

// Asigură existența tabelei `mesaje` fără migrare manuală pe producție.
// Idempotent (CREATE TABLE IF NOT EXISTS) — rulat înainte de scriere/citire.
let ensured = false;
export async function ensureMesaje(env: Env): Promise<void> {
  if (ensured) return;
  await env.DB.prepare(
    `CREATE TABLE IF NOT EXISTS mesaje (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      nume       TEXT    NOT NULL,
      email      TEXT    NOT NULL,
      telefon    TEXT,
      mesaj      TEXT    NOT NULL,
      citit      INTEGER NOT NULL DEFAULT 0,
      created_at TEXT    NOT NULL DEFAULT (datetime('now'))
    )`,
  ).run();
  ensured = true;
}
