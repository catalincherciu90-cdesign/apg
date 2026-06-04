import type { Context } from 'hono';
import { getCookie, setCookie, deleteCookie } from 'hono/cookie';
import type { Env, SessionUser } from '../types';

const COOKIE = 'apg_session';
const MAX_AGE = 60 * 60 * 24 * 30; // 30 zile

function b64urlEncode(bytes: Uint8Array): string {
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function b64urlDecode(str: string): Uint8Array {
  str = str.replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(str);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function hmac(secret: string, data: string): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(data));
  return new Uint8Array(sig);
}

function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

export async function createSessionCookie(c: Context<any>, user: SessionUser): Promise<void> {
  const payload = b64urlEncode(new TextEncoder().encode(JSON.stringify(user)));
  const sig = b64urlEncode(await hmac(c.env.SESSION_SECRET, payload));
  const token = `${payload}.${sig}`;
  setCookie(c, COOKIE, token, {
    httpOnly: true,
    secure: true,
    sameSite: 'Lax',
    path: '/',
    maxAge: MAX_AGE,
  });
}

export async function readSession(c: Context<any>): Promise<SessionUser | null> {
  const token = getCookie(c, COOKIE);
  if (!token) return null;
  const dot = token.lastIndexOf('.');
  if (dot < 0) return null;
  const payload = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  try {
    const expected = await hmac(c.env.SESSION_SECRET, payload);
    if (!timingSafeEqual(b64urlDecode(sig), expected)) return null;
    const json = new TextDecoder().decode(b64urlDecode(payload));
    const user = JSON.parse(json) as SessionUser;
    if (typeof user.uid !== 'number') return null;
    return user;
  } catch {
    return null;
  }
}

export function destroySession(c: Context<any>): void {
  deleteCookie(c, COOKIE, { path: '/' });
}
