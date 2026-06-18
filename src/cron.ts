import type { Env } from './types';
import { emailTemplate } from './lib/mailer';
import { notifica, notificareReminderProgramare, notifActiv } from './lib/notificari';
import { getSetari } from './lib/setari';
import { ensureRampaColumns } from './lib/masini';
import { esc, dateRo, addDays, diffDays, todayRo } from './lib/format';

function addMonths(d: string, months: number): string {
  const dt = new Date(String(d).slice(0, 10) + 'T00:00:00Z');
  dt.setUTCMonth(dt.getUTCMonth() + months);
  return dt.toISOString().slice(0, 10);
}

// Reminder cu o zi înainte pentru programările confirmate de mâine.
export async function ruleazaReminderProgramari(env: Env): Promise<void> {
  const s = await getSetari(env);
  if (!notifActiv(s, 'reminder_programare')) return;

  const maine = addDays(todayRo(), 1);
  const { results } = await env.DB.prepare(
    `SELECT r.nr_inmatriculare, r.producator, r.model, r.serviciu_tip, r.data, r.ora_start, u.email, u.nume
     FROM rezervari r JOIN users u ON u.id = r.user_id
     WHERE r.data = ? AND r.status = 'confirmat' AND u.email IS NOT NULL AND u.email NOT LIKE 'walkin.%'`,
  ).bind(maine).all<any>();

  for (const r of results ?? []) {
    await notificareReminderProgramare(
      env, r.email, r.nume, r.nr_inmatriculare ?? '-', r.producator ?? '', r.model ?? '', r.serviciu_tip, r.data, r.ora_start, s,
    );
  }
}

// Reminder verificare rampă — interval configurabil (luni) din Setări.
// Trimite cu ~30 de zile înainte de scadență, o singură dată.
export async function ruleazaNotificariRampa(env: Env): Promise<void> {
  const s = await getSetari(env);
  if (!notifActiv(s, 'reminder_rampa')) return;
  await ensureRampaColumns(env);

  const interval = Math.min(120, Math.max(1, parseInt(s.rampa_interval_luni || '24', 10) || 24));
  const mod = `+${interval} months`;
  const azi = todayRo();

  const { results } = await env.DB.prepare(
    `SELECT m.id, m.nr_inmatriculare, m.producator, m.model, m.data_ultima_rampa, u.email, u.nume
     FROM masini m JOIN users u ON u.id = m.user_id
     WHERE m.data_ultima_rampa IS NOT NULL
       AND m.notif_rampa_trimisa = 0
       AND date(m.data_ultima_rampa, ?, '-30 days') <= ?
       AND date(m.data_ultima_rampa, ?) > ?`,
  ).bind(mod, azi, mod, azi).all<any>();

  for (const m of results ?? []) {
    const scadenta = addMonths(m.data_ultima_rampa, interval);
    const zileRamase = diffDays(azi, scadenta);
    const continut = `
        <p>Stimate <strong>${esc(m.nume)}</strong>,</p>
        <p>Se apropie scadența verificării de rampă pentru mașina ta. Programează-te din timp!</p>
        <table class="info-table">
            <tr><td>Mașina</td><td>${esc(m.nr_inmatriculare)} — ${esc((m.producator ?? '') + ' ' + (m.model ?? ''))}</td></tr>
            <tr><td>Ultima verificare</td><td>${dateRo(m.data_ultima_rampa)}</td></tr>
            <tr><td>Următoarea verificare până la</td><td><strong>${dateRo(scadenta)}</strong></td></tr>
            <tr><td>Zile rămase</td><td>${zileRamase} zile</td></tr>
        </table>
        <a href="${env.BASE_URL}/rezervare" class="btn">Programează verificarea</a>`;

    const ok = await notifica(env, 'reminder_rampa', m.email, `Reminder verificare rampă — ${m.nr_inmatriculare} — APG Garage`, emailTemplate('Verificarea de rampă se apropie!', continut), s);
    if (ok) {
      await env.DB.prepare('UPDATE masini SET notif_rampa_trimisa = 1 WHERE id = ?').bind(m.id).run();
    }
  }
}

// Port din cron_notificari.php — ruleaza zilnic (cron trigger).
// Trimite reminder cand mai sunt <=30 zile pana la 1 an de la ultima revizie.
export async function ruleazaNotificariRevizie(env: Env): Promise<void> {
  const s = await getSetari(env);
  if (!notifActiv(s, 'reminder_revizie')) return;

  const azi = todayRo();
  const { results } = await env.DB.prepare(
    `SELECT m.*, u.email, u.nume
     FROM masini m
     JOIN users u ON u.id = m.user_id
     WHERE m.data_ultima_revizie IS NOT NULL
       AND m.notificare_trimisa = 0
       AND date(m.data_ultima_revizie, '+335 days') <= ?
       AND date(m.data_ultima_revizie, '+365 days') > ?`,
  ).bind(azi, azi).all<any>();

  for (const m of results ?? []) {
    const dataRevizie = dateRo(m.data_ultima_revizie);
    const scadenta = addDays(String(m.data_ultima_revizie).slice(0, 10), 365);
    const zileRamase = diffDays(azi, scadenta);

    const continut = `
        <p>Stimate <strong>${esc(m.nume)}</strong>,</p>
        <p>A trecut aproape un an de la ultima revizie a mașinii tale. Este momentul să programezi o nouă revizie!</p>
        <table class="info-table">
            <tr><td>Mașina</td><td>${esc(m.nr_inmatriculare)} — ${esc(m.producator + ' ' + m.model)}</td></tr>
            <tr><td>Ultima revizie</td><td>${dataRevizie}</td></tr>
            <tr><td>Revizie necesară până la</td><td><strong>${dateRo(scadenta)}</strong></td></tr>
            <tr><td>Zile rămase</td><td>${zileRamase} zile</td></tr>
        </table>
        <p>Programează-te acum pentru a-ți păstra mașina în stare optimă.</p>
        <a href="${env.BASE_URL}/rezervare" class="btn">Programează revizia</a>`;

    const ok = await notifica(env, 'reminder_revizie', m.email, `Reminder revizie — ${m.nr_inmatriculare} — APG Garage`, emailTemplate('Revizia mașinii tale se apropie!', continut), s);
    if (ok) {
      await env.DB.prepare('UPDATE masini SET notificare_trimisa = 1 WHERE id = ?').bind(m.id).run();
    }
  }
}
