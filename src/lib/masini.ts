import type { Env } from '../types';

// Adaugă „lazy" coloanele pentru tracking verificare rampă pe tabela `masini`,
// fără migrare manuală pe producție. ALTER ... ADD COLUMN dă eroare dacă deja
// există, deci îl prindem în try/catch (idempotent).
let ensured = false;
export async function ensureRampaColumns(env: Env): Promise<void> {
  if (ensured) return;
  for (const sql of [
    `ALTER TABLE masini ADD COLUMN data_ultima_rampa TEXT`,
    `ALTER TABLE masini ADD COLUMN notif_rampa_trimisa INTEGER NOT NULL DEFAULT 0`,
  ]) {
    try {
      await env.DB.prepare(sql).run();
    } catch {
      /* coloana există deja */
    }
  }
  ensured = true;
}
