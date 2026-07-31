import type { Env } from '../types';

// Web Push (VAPID) — notificări pe telefon când intră o programare nouă.
// Trimitem push „fără payload" (SW-ul afișează un mesaj fix), ca să evităm
// criptarea aes128gcm. Necesită VAPID_PUBLIC / VAPID_PRIVATE.

let ensured = false;
export async function ensurePush(env: Env): Promise<void> {
  if (ensured) return;
  await env.DB.prepare(
    `CREATE TABLE IF NOT EXISTS push_subs (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      endpoint   TEXT NOT NULL UNIQUE,
      p256dh     TEXT,
      auth       TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
  ).run();
  ensured = true;
}

export async function saveSub(env: Env, endpoint: string, p256dh: string, auth: string): Promise<void> {
  await ensurePush(env);
  await env.DB.prepare(
    'INSERT INTO push_subs (endpoint, p256dh, auth) VALUES (?, ?, ?) ON CONFLICT(endpoint) DO UPDATE SET p256dh = excluded.p256dh, auth = excluded.auth',
  ).bind(endpoint, p256dh, auth).run();
}

function b64urlToBytes(s: string): Uint8Array {
  s = s.replace(/-/g, '+').replace(/_/g, '/');
  while (s.length % 4) s += '=';
  const bin = atob(s);
  const a = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) a[i] = bin.charCodeAt(i);
  return a;
}
function bytesToB64url(a: Uint8Array): string {
  let bin = '';
  for (let i = 0; i < a.length; i++) bin += String.fromCharCode(a[i]);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
const strB64url = (s: string) => bytesToB64url(new TextEncoder().encode(s));

async function vapidAuth(env: Env, aud: string): Promise<string> {
  const header = { typ: 'JWT', alg: 'ES256' };
  const payload = { aud, exp: Math.floor(Date.now() / 1000) + 12 * 3600, sub: env.VAPID_SUBJECT || 'mailto:contact@apg-garage.ro' };
  const unsigned = strB64url(JSON.stringify(header)) + '.' + strB64url(JSON.stringify(payload));
  const key = await crypto.subtle.importKey('pkcs8', b64urlToBytes(env.VAPID_PRIVATE as string), { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key, new TextEncoder().encode(unsigned));
  return unsigned + '.' + bytesToB64url(new Uint8Array(sig));
}

export async function trimitePush(env: Env): Promise<void> {
  if (!env.VAPID_PRIVATE || !env.VAPID_PUBLIC) return;
  await ensurePush(env);
  const { results } = await env.DB.prepare('SELECT endpoint FROM push_subs').all<{ endpoint: string }>();
  for (const s of results ?? []) {
    try {
      const origin = new URL(s.endpoint).origin;
      const jwt = await vapidAuth(env, origin);
      const res = await fetch(s.endpoint, {
        method: 'POST',
        headers: { Authorization: `vapid t=${jwt}, k=${env.VAPID_PUBLIC}`, TTL: '3600' },
      });
      if (res.status === 404 || res.status === 410) {
        await env.DB.prepare('DELETE FROM push_subs WHERE endpoint = ?').bind(s.endpoint).run();
      }
    } catch (e) {
      console.error('Push error:', e);
    }
  }
}
