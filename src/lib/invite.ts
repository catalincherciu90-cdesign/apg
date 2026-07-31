import type { Env } from '../types';

// Token de invitație pentru setarea contului de angajat. Include hash-ul parolei
// curente, deci devine invalid automat după ce angajatul își setează parola
// (efectiv o singură folosire).
async function hmacHex(secret: string, msg: string): Promise<string> {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret || 'apg'), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(msg));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export function inviteToken(env: Env, uid: number | string, hash: string): Promise<string> {
  return hmacHex(env.SESSION_SECRET, 'invite:' + uid + ':' + hash);
}

// Coloană (lazy) care marchează dacă un cont și-a setat parola. Implicit 1
// (conturile existente sunt considerate active); conturile invitate se pun pe 0.
let colEnsured = false;
export async function ensureContActivat(env: Env): Promise<void> {
  if (colEnsured) return;
  try {
    await env.DB.prepare('ALTER TABLE users ADD COLUMN cont_activat INTEGER NOT NULL DEFAULT 1').run();
  } catch {
    /* coloana există deja */
  }
  colEnsured = true;
}
