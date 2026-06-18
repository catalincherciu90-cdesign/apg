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

// Afișare prietenoasă cu confidențialitatea: prenume întreg + inițialele
// restului numelui. Ex: "Andrei Marinescu" -> "Andrei M.".
export function numeScurt(nume: string): string {
  const parti = String(nume ?? '').trim().split(/\s+/).filter(Boolean);
  if (parti.length <= 1) return parti[0] ?? '';
  const initiale = parti.slice(1).map((p) => p.charAt(0).toUpperCase() + '.').join(' ');
  return parti[0] + ' ' + initiale;
}

// Token HMAC pentru linkul de recenzie din email (nu poate fi ghicit/forjat).
async function hmacHex(secret: string, msg: string): Promise<string> {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret || 'apg'), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(msg));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, '0')).join('').slice(0, 32);
}

export function reviewToken(env: Env, rezervareId: number | string): Promise<string> {
  return hmacHex(env.SESSION_SECRET, 'recenzie:' + rezervareId);
}

export async function verifyReviewToken(env: Env, rezervareId: number | string, token: string): Promise<boolean> {
  if (!token) return false;
  const expected = await reviewToken(env, rezervareId);
  return token.length === expected.length && token === expected;
}

