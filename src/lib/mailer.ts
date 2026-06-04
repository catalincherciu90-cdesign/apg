import type { Env } from '../types';
import { esc, numberFormat, anCurent } from './format';

// Port din src/helpers/Mailer.php — trimitere prin Resend (API HTTP),
// deoarece Workers nu pot deschide conexiuni SMTP brute.
export async function trimiteEmail(env: Env, to: string, subject: string, html: string): Promise<boolean> {
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ from: env.MAIL_FROM, to, subject, html }),
    });
    if (!res.ok) {
      console.error('Mailer error:', res.status, await res.text());
      return false;
    }
    return true;
  } catch (e) {
    console.error('Mailer exception:', e);
    return false;
  }
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

const SERVICII: Record<string, string> = {
  revizie: 'Revizie',
  reparatie: 'Reparație mecanică',
  verificare_rampa: 'Verificare rampă',
};

export async function notificareContNou(env: Env, nume: string, email: string, telefon: string) {
  const continut = `
    <p>Un client nou s-a înregistrat pe site.</p>
    <table class="info-table">
      <tr><td>Nume</td><td>${esc(nume)}</td></tr>
      <tr><td>Email</td><td>${esc(email)}</td></tr>
      <tr><td>Telefon</td><td>${esc(telefon || '—')}</td></tr>
    </table>
    <a href="${env.BASE_URL}/admin" class="btn">Vezi panoul admin</a>`;
  await trimiteEmail(env, env.MAIL_ADMIN, 'Cont nou înregistrat — ' + nume, emailTemplate('Cont nou înregistrat', continut));

  const continutClient = `
    <p>Bun venit, <strong>${esc(nume)}</strong>!</p>
    <p>Contul tău pe APG Garage a fost creat cu succes. Te poți autentifica și face o programare oricând.</p>
    <a href="${env.BASE_URL}/login" class="btn">Mergi la cont</a>`;
  await trimiteEmail(env, email, 'Bun venit la APG Garage!', emailTemplate('Contul tău a fost creat', continutClient));
}

export async function notificareProgramareNoua(
  env: Env,
  nume: string,
  email: string,
  nr: string,
  producator: string,
  model: string,
  serviciu: string,
  data: string,
  ora: string,
  durata: number,
) {
  const serviciuText = SERVICII[serviciu] ?? serviciu;
  const [y, m, d] = data.split('-');
  const dataText = `${d}.${m}.${y}`;
  const oraText = ora.slice(0, 5);

  const continut = `
    <p>O nouă programare a fost înregistrată și așteaptă confirmare.</p>
    <table class="info-table">
      <tr><td>Client</td><td>${esc(nume)}</td></tr>
      <tr><td>Email</td><td>${esc(email)}</td></tr>
      <tr><td>Mașina</td><td>${esc(nr)} — ${esc(producator + ' ' + model)}</td></tr>
      <tr><td>Serviciu</td><td>${serviciuText}</td></tr>
      <tr><td>Data</td><td>${dataText} ora ${oraText}</td></tr>
      <tr><td>Durată</td><td>${durata} ore</td></tr>
    </table>
    <a href="${env.BASE_URL}/admin" class="btn">Confirmă programarea</a>`;
  await trimiteEmail(env, env.MAIL_ADMIN, `Programare nouă — ${nume} / ${nr}`, emailTemplate('Programare nouă în așteptare', continut));

  const continutClient = `
    <p>Programarea ta a fost înregistrată cu succes și este în așteptarea confirmării din partea service-ului.</p>
    <table class="info-table">
      <tr><td>Mașina</td><td>${esc(nr)} — ${esc(producator + ' ' + model)}</td></tr>
      <tr><td>Serviciu</td><td>${serviciuText}</td></tr>
      <tr><td>Data</td><td>${dataText} ora ${oraText}</td></tr>
      <tr><td>Durată</td><td>${durata} ore</td></tr>
      <tr><td>Status</td><td>În așteptare</td></tr>
    </table>
    <p>Vei primi un email când programarea este confirmată.</p>
    <a href="${env.BASE_URL}/dashboard" class="btn">Vezi programările mele</a>`;
  await trimiteEmail(env, email, `Programare înregistrată — ${dataText}`, emailTemplate('Programarea ta a fost înregistrată', continutClient));
}

export async function notificareDevizNou(env: Env, email: string, nr: string, rezervareId: number, total: number) {
  const continut = `
    <p>Service-ul APG Garage a emis un deviz pentru mașina ta.</p>
    <table class="info-table">
      <tr><td>Mașina</td><td>${esc(nr)}</td></tr>
      <tr><td>Total deviz</td><td><strong>${numberFormat(total, 2)} lei</strong></td></tr>
    </table>
    <p>Intră în contul tău pentru a vedea detaliile complete ale devizului.</p>
    <a href="${env.BASE_URL}/deviz?rezervare_id=${rezervareId}" class="btn">Vezi devizul</a>`;
  await trimiteEmail(env, email, 'Deviz nou disponibil — APG Garage', emailTemplate('Ai un deviz nou', continut));
}
