import type { Env } from '../types';

// Adaugă „lazy" coloanele pentru decizia clientului pe deviz (aprobat/respins),
// fără migrare manuală pe producție.
let ensured = false;
export async function ensureDevizDecizie(env: Env): Promise<void> {
  if (ensured) return;
  for (const sql of [
    `ALTER TABLE devize ADD COLUMN decizie TEXT`,
    `ALTER TABLE devize ADD COLUMN decizie_data TEXT`,
  ]) {
    try {
      await env.DB.prepare(sql).run();
    } catch {
      /* coloana există deja */
    }
  }
  ensured = true;
}
