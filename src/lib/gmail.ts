import type { Env, SendResult } from '../types';

// Trimitere prin Gmail API (OAuth2). Workers nu pot folosi SMTP, deci folosim
// REST API-ul Gmail cu un refresh token. Activ doar dacă secretele sunt setate.

export function gmailConfigured(env: Env): boolean {
  return !!(env.GMAIL_CLIENT_ID && env.GMAIL_CLIENT_SECRET && env.GMAIL_REFRESH_TOKEN);
}

// Cache simplu al access token-ului în isolate-ul curent.
const tokenCache: Record<string, { token: string; exp: number }> = {};

async function getAccessToken(env: Env): Promise<string> {
  const key = env.GMAIL_REFRESH_TOKEN as string;
  const now = Date.now();
  const c = tokenCache[key];
  if (c && c.exp > now + 30_000) return c.token;

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: env.GMAIL_CLIENT_ID as string,
      client_secret: env.GMAIL_CLIENT_SECRET as string,
      refresh_token: env.GMAIL_REFRESH_TOKEN as string,
      grant_type: 'refresh_token',
    }),
  });
  if (!res.ok) {
    throw new Error(`OAuth ${res.status}: ${(await res.text()).slice(0, 200)}`);
  }
  const j = (await res.json()) as { access_token: string; expires_in?: number };
  tokenCache[key] = { token: j.access_token, exp: now + (j.expires_in ?? 3600) * 1000 };
  return j.access_token;
}

function base64(bytes: Uint8Array): string {
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}
function base64url(s: string): string {
  return base64(new TextEncoder().encode(s)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
// RFC 2047 — subiect cu diacritice
function encodeSubject(subject: string): string {
  return `=?UTF-8?B?${base64(new TextEncoder().encode(subject))}?=`;
}
function wrap76(s: string): string {
  return (s.match(/.{1,76}/g) ?? []).join('\r\n');
}

export async function sendViaGmail(env: Env, to: string | string[], subject: string, html: string): Promise<SendResult> {
  try {
    const token = await getAccessToken(env);
    const from = env.GMAIL_SENDER || env.MAIL_FROM;
    const toList = (Array.isArray(to) ? to : [to]).join(', ');
    const bodyB64 = wrap76(base64(new TextEncoder().encode(html)));

    const headers = [
      `From: ${from}`,
      `To: ${toList}`,
      env.MAIL_REPLY_TO ? `Reply-To: ${env.MAIL_REPLY_TO}` : '',
      `Subject: ${encodeSubject(subject)}`,
      'MIME-Version: 1.0',
      'Content-Type: text/html; charset="UTF-8"',
      'Content-Transfer-Encoding: base64',
    ].filter(Boolean).join('\r\n');

    const mime = headers + '\r\n\r\n' + bodyB64;
    const raw = base64url(mime);

    const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ raw }),
    });
    if (!res.ok) {
      const t = await res.text();
      console.error('Gmail error:', res.status, t);
      return { ok: false, error: `Gmail ${res.status}: ${t.slice(0, 300)}` };
    }
    return { ok: true };
  } catch (e: any) {
    console.error('Gmail exception:', e);
    return { ok: false, error: String(e?.message ?? e).slice(0, 300) };
  }
}
