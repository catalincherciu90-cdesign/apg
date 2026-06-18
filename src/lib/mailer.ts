import type { Env } from '../types';
import { anCurent } from './format';

// Nivel jos — trimitere prin Resend (API HTTP), deoarece Workers nu pot
// deschide conexiuni SMTP brute. Logica de business (toggle-uri, destinatari,
// jurnal, șabloane de conținut) stă în lib/notificari.ts.

export interface SendResult {
  ok: boolean;
  error?: string;
}

export async function sendRaw(env: Env, to: string | string[], subject: string, html: string): Promise<SendResult> {
  try {
    const payload: Record<string, unknown> = { from: env.MAIL_FROM, to, subject, html };
    // Reply-To (ex. un Gmail) — răspunsurile clienților ajung acolo.
    if (env.MAIL_REPLY_TO && env.MAIL_REPLY_TO.trim()) payload.reply_to = env.MAIL_REPLY_TO.trim();
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const txt = await res.text();
      console.error('Mailer error:', res.status, txt);
      return { ok: false, error: `HTTP ${res.status}: ${txt.slice(0, 300)}` };
    }
    return { ok: true };
  } catch (e: any) {
    console.error('Mailer exception:', e);
    return { ok: false, error: String(e?.message ?? e).slice(0, 300) };
  }
}

// Compat — trimitere simplă (boolean). Preferă notifica() din lib/notificari.ts.
export async function trimiteEmail(env: Env, to: string, subject: string, html: string): Promise<boolean> {
  return (await sendRaw(env, to, subject, html)).ok;
}

export function emailTemplate(titlu: string, continut: string): string {
  return `<!DOCTYPE html>
<html lang="ro">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<style>
  body { margin:0; padding:0; background:#111; font-family:Arial,sans-serif; }
  .wrap { max-width:580px; margin:0 auto; padding:30px 20px; }
  .header { background:#0a0a0a; border-top:4px solid #c0392b; padding:20px 30px; }
  .header h1 { margin:0; font-size:22px; color:#f5f5f5; letter-spacing:2px; text-transform:uppercase; }
  .header h1 span { color:#c0392b; }
  .body { background:#1a1a1a; padding:30px; border:1px solid #2a2a2a; border-top:none; }
  .body h2 { color:#f5f5f5; font-size:18px; margin-top:0; }
  .body p { color:#cccccc; line-height:1.7; font-size:14px; }
  .info-table { width:100%; border-collapse:collapse; margin:16px 0; }
  .info-table td { padding:8px 12px; font-size:13px; border-bottom:1px solid #2a2a2a; }
  .info-table td:first-child { color:#888; width:40%; }
  .info-table td:last-child { color:#f5f5f5; font-weight:600; }
  .btn { display:inline-block; background:#c0392b; color:#ffffff; padding:12px 24px; text-decoration:none; font-weight:700; font-size:14px; letter-spacing:1px; text-transform:uppercase; margin-top:16px; }
  .footer { background:#0a0a0a; padding:16px 30px; text-align:center; border:1px solid #2a2a2a; border-top:none; }
  .footer p { color:#555; font-size:12px; margin:0; }
</style>
</head>
<body>
<div class="wrap">
  <div class="header"><h1>APG <span>Garage</span></h1></div>
  <div class="body">
    <h2>${titlu}</h2>
    ${continut}
  </div>
  <div class="footer"><p>&copy; ${anCurent()} APG Garage &mdash; apg-garage.ro</p></div>
</div>
</body>
</html>`;
}
