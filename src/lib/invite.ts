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
