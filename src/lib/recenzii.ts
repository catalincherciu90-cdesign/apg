import type { Env } from '../types';

// Asigură existența tabelei `recenzii` (lazy, fără migrare manuală pe producție).
let ensured = false;
export async function ensureRecenzii(env: Env): Promise<void> {
  if (ensured) return;
  await env.DB.prepare(
    `CREATE TABLE IF NOT EXISTS recenzii (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      nume       TEXT    NOT NULL,
      rating     INTEGER NOT NULL DEFAULT 5,
      text       TEXT    NOT NULL,
      activ      INTEGER NOT NULL DEFAULT 1,
      ordine     INTEGER NOT NULL DEFAULT 0,
      created_at TEXT    NOT NULL DEFAULT (datetime('now'))
    )`,
  ).run();
  ensured = true;
}

export function stele(rating: number): string {
  const r = Math.max(1, Math.min(5, Math.round(rating)));
  return '★★★★★☆☆☆☆☆'.slice(5 - r, 10 - r);
}
