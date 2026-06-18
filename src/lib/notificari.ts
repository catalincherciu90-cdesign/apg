import type { Env } from '../types';
import { esc, numberFormat } from './format';
import { sendRaw, emailTemplate } from './mailer';
import { getSetari } from './setari';

/* ============================================================
 * Registru de notificări — sursa unică de adevăr.
 * Fiecare tip are un toggle în `setari` cu cheia `notif_<key>`
 * (implicit activ). `catre` spune dacă destinatarul e clientul
 * sau administratorul.
 * ========================================================== */
export interface NotifEvent {
  key: string;
  label: string;
  catre: 'client' | 'admin';
  descriere: string;
}

export const NOTIF_EVENTS: NotifEvent[] = [
  { key: 'cont_nou_client', label: 'Bun venit (cont nou)', catre: 'client', descriere: 'Email de bun venit trimis clientului la crearea contului.' },
  { key: 'programare_client', label: 'Confirmare programare', catre: 'client', descriere: 'Confirmarea înregistrării programării, trimisă clientului.' },
  { key: 'deviz_client', label: 'Deviz nou', catre: 'client', descriere: 'Notificare către client când service-ul emite un deviz.' },
  { key: 'reminder_programare', label: 'Reminder programare (cu o zi înainte)', catre: 'client', descriere: 'Reminder automat trimis clientului cu o zi înainte de programare.' },
  { key: 'reminder_revizie', label: 'Reminder revizie', catre: 'client', descriere: 'Reminder automat când se apropie un an de la ultima revizie.' },
  { key: 'reminder_rampa', label: 'Reminder verificare rampă', catre: 'client', descriere: 'Reminder automat când se apropie scadența verificării de rampă (interval configurabil în Setări).' },
  { key: 'raspuns_piesa_client', label: 'Răspuns cerere piesă', catre: 'client', descriere: 'Răspunsul service-ului la o cerere de piesă din dezmembrări.' },
  { key: 'mesaj_contact_client', label: 'Confirmare mesaj contact', catre: 'client', descriere: 'Confirmare trimisă clientului că mesajul lui a fost primit.' },

  { key: 'cont_nou_admin', label: 'Cont nou înregistrat', catre: 'admin', descriere: 'Alertă către admin când un client nou își creează cont.' },
  { key: 'programare_admin', label: 'Programare nouă', catre: 'admin', descriere: 'Alertă către admin la fiecare programare nouă.' },
  { key: 'mesaj_contact_admin', label: 'Mesaj din formularul de contact', catre: 'admin', descriere: 'Alertă către admin la primirea unui mesaj de contact.' },
  { key: 'tractare_admin', label: 'Cerere tractare', catre: 'admin', descriere: 'Alertă către admin la o cerere nouă de tractare.' },
  { key: 'piesa_admin', label: 'Cerere piesă dezmembrări', catre: 'admin', descriere: 'Alertă către admin la o cerere nouă de piesă.' },
];

export function notifActiv(s: Record<string, string>, key: string): boolean {
  return (s['notif_' + key] ?? '1') === '1';
}

// Adresele de admin care primesc alertele (multiple, separate prin virgulă,
// punct-virgulă sau linie nouă). Fallback la MAIL_ADMIN din mediu.
export function getAdminEmails(s: Record<string, string>, env: Env): string[] {
  const raw = (s.notif_admin_emails ?? '').trim() || env.MAIL_ADMIN || '';
  return raw
    .split(/[,;\n]/)
    .map((e) => e.trim())
    .filter((e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e));
}

/* ============================ JURNAL ============================ */
let logEnsured = false;
export async function ensureNotifLog(env: Env): Promise<void> {
  if (logEnsured) return;
  await env.DB.prepare(
    `CREATE TABLE IF NOT EXISTS notificari_log (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      tip        TEXT    NOT NULL,
      destinatar TEXT    NOT NULL,
      subiect    TEXT    NOT NULL,
      status     TEXT    NOT NULL,
      eroare     TEXT,
      created_at TEXT    NOT NULL DEFAULT (datetime('now'))
    )`,
  ).run();
  logEnsured = true;
}

async function logNotif(env: Env, tip: string, destinatar: string, subiect: string, status: string, eroare: string): Promise<void> {
  try {
    await ensureNotifLog(env);
    await env.DB.prepare('INSERT INTO notificari_log (tip, destinatar, subiect, status, eroare) VALUES (?, ?, ?, ?, ?)')
      .bind(tip, destinatar.slice(0, 400), subiect.slice(0, 300), status, (eroare || '').slice(0, 400))
      .run();
  } catch (e) {
    console.error('Eroare la scrierea jurnalului de notificări:', e);
  }
}

/* ============================ DISPECER ============================ */
// Verifică toggle-ul, trimite și înregistrează rezultatul în jurnal.
// `s` (setările) poate fi pasat pentru a evita o interogare în plus.
export async function notifica(
  env: Env,
  tip: string,
  to: string | string[],
  subiect: string,
  html: string,
  s?: Record<string, string>,
): Promise<boolean> {
  const setari = s ?? (await getSetari(env));
  const dest = (Array.isArray(to) ? to : [to]).map((x) => String(x ?? '').trim()).filter(Boolean);
  const destStr = dest.join(', ');

  if (!notifActiv(setari, tip)) {
    await logNotif(env, tip, destStr, subiect, 'dezactivat', '');
    return false;
  }
  if (dest.length === 0) {
    await logNotif(env, tip, destStr || '(niciun destinatar)', subiect, 'esuat', 'Niciun destinatar valid');
    return false;
  }
  const r = await sendRaw(env, dest.length === 1 ? dest[0] : dest, subiect, html);
  await logNotif(env, tip, destStr, subiect, r.ok ? 'trimis' : 'esuat', r.error ?? '');
  return r.ok;
}

/* ============================ ȘABLOANE ============================ */
const SERVICII: Record<string, string> = {
  revizie: 'Revizie',
  reparatie: 'Reparație mecanică',
  verificare_rampa: 'Verificare rampă',
};
const servLabel = (s: string) => SERVICII[s] ?? s;

export async function notificareContNou(env: Env, nume: string, email: string, telefon: string) {
  const s = await getSetari(env);
  const admini = getAdminEmails(s, env);

  const continut = `
    <p>Un client nou s-a înregistrat pe site.</p>
    <table class="info-table">
      <tr><td>Nume</td><td>${esc(nume)}</td></tr>
      <tr><td>Email</td><td>${esc(email)}</td></tr>
      <tr><td>Telefon</td><td>${esc(telefon || '—')}</td></tr>
    </table>
    <a href="${env.BASE_URL}/admin" class="btn">Vezi panoul admin</a>`;
  await notifica(env, 'cont_nou_admin', admini, 'Cont nou înregistrat — ' + nume, emailTemplate('Cont nou înregistrat', continut), s);

  const continutClient = `
    <p>Bun venit, <strong>${esc(nume)}</strong>!</p>
    <p>Contul tău pe APG Garage a fost creat cu succes. Te poți autentifica și face o programare oricând.</p>
    <a href="${env.BASE_URL}/login" class="btn">Mergi la cont</a>`;
  await notifica(env, 'cont_nou_client', email, 'Bun venit la APG Garage!', emailTemplate('Contul tău a fost creat', continutClient), s);
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
  const s = await getSetari(env);
  const admini = getAdminEmails(s, env);
  const serviciuText = servLabel(serviciu);
  const [y, m, d] = data.split('-');
  const dataText = `${d}.${m}.${y}`;
  const oraText = ora.slice(0, 5);

  const continut = `
    <p>O nouă programare a fost înregistrată și așteaptă confirmare.</p>
    <table class="info-table">
      <tr><td>Client</td><td>${esc(nume)}</td></tr>
      <tr><td>Email</td><td>${esc(email)}</td></tr>
      <tr><td>Mașina</td><td>${esc(nr)} — ${esc(producator + ' ' + model)}</td></tr>
      <tr><td>Serviciu</td><td>${esc(serviciuText)}</td></tr>
      <tr><td>Data</td><td>${dataText} ora ${oraText}</td></tr>
      <tr><td>Durată</td><td>${durata} ore</td></tr>
    </table>
    <a href="${env.BASE_URL}/admin" class="btn">Confirmă programarea</a>`;
  await notifica(env, 'programare_admin', admini, `Programare nouă — ${nume} / ${nr}`, emailTemplate('Programare nouă în așteptare', continut), s);

  const continutClient = `
    <p>Programarea ta a fost înregistrată cu succes și este în așteptarea confirmării din partea service-ului.</p>
    <table class="info-table">
      <tr><td>Mașina</td><td>${esc(nr)} — ${esc(producator + ' ' + model)}</td></tr>
      <tr><td>Serviciu</td><td>${esc(serviciuText)}</td></tr>
      <tr><td>Data</td><td>${dataText} ora ${oraText}</td></tr>
      <tr><td>Durată</td><td>${durata} ore</td></tr>
      <tr><td>Status</td><td>În așteptare</td></tr>
    </table>
    <p>Vei primi un email când programarea este confirmată.</p>
    <a href="${env.BASE_URL}/dashboard" class="btn">Vezi programările mele</a>`;
  await notifica(env, 'programare_client', email, `Programare înregistrată — ${dataText}`, emailTemplate('Programarea ta a fost înregistrată', continutClient), s);
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
  await notifica(env, 'deviz_client', email, 'Deviz nou disponibil — APG Garage', emailTemplate('Ai un deviz nou', continut));
}

export async function notificareReminderProgramare(
  env: Env,
  email: string,
  nume: string,
  nr: string,
  producator: string,
  model: string,
  serviciu: string,
  data: string,
  ora: string,
  s?: Record<string, string>,
) {
  const serviciuText = servLabel(serviciu);
  const [y, m, d] = String(data).slice(0, 10).split('-');
  const continut = `
    <p>Bună, <strong>${esc(nume)}</strong>! Îți reamintim că ai o programare la APG Garage <strong>mâine</strong>.</p>
    <table class="info-table">
      <tr><td>Mașina</td><td>${esc(nr)} — ${esc(producator + ' ' + model)}</td></tr>
      <tr><td>Serviciu</td><td>${esc(serviciuText)}</td></tr>
      <tr><td>Data</td><td>${d}.${m}.${y} ora ${String(ora).slice(0, 5)}</td></tr>
    </table>
    <p>Te așteptăm! Dacă nu mai poți ajunge, te rugăm să ne anunți.</p>
    <a href="${env.BASE_URL}/dashboard" class="btn">Vezi programarea</a>`;
  await notifica(env, 'reminder_programare', email, 'Reminder programare mâine — APG Garage', emailTemplate('Programarea ta este mâine', continut), s);
}

export async function notificareMesajContact(env: Env, nume: string, email: string, telefon: string, mesaj: string) {
  const s = await getSetari(env);
  const admini = getAdminEmails(s, env);
  const continut = `<p>Un mesaj nou a fost trimis prin formularul de contact.</p>
    <table class="info-table">
      <tr><td>Nume</td><td>${esc(nume)}</td></tr>
      <tr><td>Email</td><td>${esc(email)}</td></tr>
      <tr><td>Telefon</td><td>${esc(telefon || '—')}</td></tr>
    </table>
    <p style="white-space:pre-wrap;">${esc(mesaj)}</p>
    <a href="${env.BASE_URL}/admin/mesaje" class="btn">Vezi în admin</a>`;
  await notifica(env, 'mesaj_contact_admin', admini, 'Mesaj nou de pe site — ' + nume, emailTemplate('Mesaj nou din formularul de contact', continut), s);

  // Confirmare către client
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    const continutClient = `
      <p>Bună, <strong>${esc(nume)}</strong>!</p>
      <p>Am primit mesajul tău și îți mulțumim că ne-ai scris. Revenim cu un răspuns în cel mai scurt timp posibil.</p>
      <table class="info-table">
        <tr><td>Mesajul tău</td><td style="white-space:pre-wrap;">${esc(mesaj)}</td></tr>
      </table>
      <p>Dacă ai o urgență, ne poți suna direct.</p>
      <a href="${env.BASE_URL}" class="btn">Înapoi la site</a>`;
    await notifica(env, 'mesaj_contact_client', email, 'Am primit mesajul tău — APG Garage', emailTemplate('Mesajul tău a fost primit', continutClient), s);
  }
}

export async function notificareCerereTractare(
  env: Env,
  nume: string,
  telefon: string,
  locatie: string,
  masina: string,
  descriere: string,
) {
  const s = await getSetari(env);
  const admini = getAdminEmails(s, env);
  const continut = `<p>O nouă cerere de tractare a fost înregistrată.</p><table class="info-table">
      <tr><td>Nume</td><td>${esc(nume)}</td></tr>
      <tr><td>Telefon</td><td>${esc(telefon)}</td></tr>
      <tr><td>Locație</td><td>${esc(locatie)}</td></tr>
      <tr><td>Mașina</td><td>${esc(masina)}</td></tr>
      <tr><td>Problemă</td><td>${esc(descriere || '—')}</td></tr>
    </table><a href="${env.BASE_URL}/admin/tractari" class="btn">Vezi cererea în admin</a>`;
  await notifica(env, 'tractare_admin', admini, 'Cerere tractare nouă — ' + nume, emailTemplate('Cerere tractare nouă', continut), s);
}

export async function notificareCererePiesa(
  env: Env,
  nume: string,
  telefon: string,
  masina: string,
  piesa: string,
) {
  const s = await getSetari(env);
  const admini = getAdminEmails(s, env);
  const continut = `<p>O nouă cerere de piesă din dezmembrări a fost înregistrată.</p><table class="info-table">
      <tr><td>Client</td><td>${esc(nume)}</td></tr>
      <tr><td>Telefon</td><td>${esc(telefon)}</td></tr>
      <tr><td>Mașina dezmembrată</td><td>${esc(masina)}</td></tr>
      <tr><td>Piesa dorită</td><td>${esc(piesa)}</td></tr>
    </table><a href="${env.BASE_URL}/admin/dezmembrari" class="btn">Vezi cererea în admin</a>`;
  await notifica(env, 'piesa_admin', admini, 'Cerere piesă dezmembrări — ' + nume, emailTemplate('Cerere piesă nouă', continut), s);
}

export async function notificareRaspunsPiesa(
  env: Env,
  email: string,
  masina: string,
  piesa: string,
  status: 'disponibil' | 'indisponibil',
  raspunsHtml: string,
) {
  const statusText = status === 'disponibil' ? 'DISPONIBILĂ' : 'INDISPONIBILĂ';
  const culoare = status === 'disponibil' ? '#2ecc71' : '#c0392b';
  const continut = `<p>Ai primit un răspuns la cererea ta de piesă.</p><table class="info-table">
      <tr><td>Mașina</td><td>${esc(masina)}</td></tr>
      <tr><td>Piesa cerută</td><td>${esc(piesa)}</td></tr>
      <tr><td>Disponibilitate</td><td><strong style="color:${culoare};">${statusText}</strong></td></tr>
    </table><p style="margin-top:1rem;"><strong>Mesaj de la service:</strong><br>${raspunsHtml}</p>
    <a href="${env.BASE_URL}/dezmembrari" class="btn">Vezi alte piese disponibile</a>`;
  await notifica(env, 'raspuns_piesa_client', email, 'Răspuns cerere piesă — APG Garage', emailTemplate('Răspuns la cererea ta de piesă', continut));
}
