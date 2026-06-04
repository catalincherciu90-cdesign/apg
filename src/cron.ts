import type { Env } from './types';
import { trimiteEmail, emailTemplate } from './lib/mailer';
import { esc, dateRo, addDays, diffDays, todayRo } from './lib/format';

// Port din cron_notificari.php — ruleaza zilnic (cron trigger).
// Trimite reminder cand mai sunt <=30 zile pana la 1 an de la ultima revizie.
export async function ruleazaNotificariRevizie(env: Env): Promise<void> {
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

    const ok = await trimiteEmail(env, m.email, `Reminder revizie — ${m.nr_inmatriculare} — APG Garage`, emailTemplate('Revizia mașinii tale se apropie!', continut));
    if (ok) {
      await env.DB.prepare('UPDATE masini SET notificare_trimisa = 1 WHERE id = ?').bind(m.id).run();
    }
  }
}
