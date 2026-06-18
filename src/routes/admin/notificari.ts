import { Hono } from 'hono';
import type { Env, Variables, AppContext } from '../../types';
import { page } from '../../views/layout';
import { esc } from '../../lib/format';
import { getSetari, setSetare } from '../../lib/setari';
import { sendRaw, emailTemplate } from '../../lib/mailer';
import { NOTIF_EVENTS, notifActiv, getAdminEmails, ensureNotifLog } from '../../lib/notificari';
import { gmailConfigured } from '../../lib/gmail';

const app = new Hono<{ Bindings: Env; Variables: Variables }>();

function dtRo(s: string): string {
  const d = new Date(String(s).replace(' ', 'T') + 'Z');
  if (isNaN(d.getTime())) return esc(s);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(d.getUTCDate())}.${p(d.getUTCMonth() + 1)}.${d.getUTCFullYear()} ${p(d.getUTCHours())}:${p(d.getUTCMinutes())}`;
}

const STYLE = `<style>
    .notif-card { background:var(--dark2); border:1px solid var(--border); border-top:4px solid var(--red); padding:1.5rem; margin-bottom:1.5rem; }
    .notif-card h3 { font-family:'Barlow Condensed',sans-serif; font-size:1.15rem; font-weight:700; text-transform:uppercase; letter-spacing:1px; margin-bottom:0.4rem; }
    .notif-card .hint { color:var(--grey); font-size:0.83rem; margin-bottom:1rem; line-height:1.5; }
    .notif-row { display:flex; justify-content:space-between; align-items:center; gap:1rem; padding:0.8rem 0; border-bottom:1px solid var(--border); }
    .notif-row:last-child { border-bottom:none; }
    .notif-row .nr-info { min-width:0; }
    .notif-row .nr-info .t { font-weight:600; font-size:0.92rem; }
    .notif-row .nr-info .d { color:var(--grey); font-size:0.78rem; margin-top:0.15rem; }
    .toggle-btn { padding:0.35rem 0.9rem; font-family:'Barlow Condensed',sans-serif; font-size:0.8rem; font-weight:700; letter-spacing:1px; text-transform:uppercase; cursor:pointer; border:1px solid; background:none; white-space:nowrap; transition:all 0.15s; }
    .toggle-btn.on { border-color:#1e8449; color:#2ecc71; } .toggle-btn.on:hover { background:#1e8449; color:#fff; }
    .toggle-btn.off { border-color:#444; color:#777; } .toggle-btn.off:hover { background:#444; color:#fff; }
    .grup-titlu { font-family:'Barlow Condensed',sans-serif; font-size:0.8rem; font-weight:700; letter-spacing:2px; text-transform:uppercase; color:var(--red); margin:0.5rem 0; }
    .jurnal-tabel { width:100%; }
    .badge-st { font-size:0.72rem; font-weight:700; letter-spacing:0.5px; padding:0.15rem 0.55rem; border-radius:3px; text-transform:uppercase; }
    .st-trimis { background:rgba(46,204,113,0.12); color:#2ecc71; }
    .st-esuat { background:rgba(192,57,43,0.15); color:#e74c3c; }
    .st-dezactivat { background:rgba(255,255,255,0.06); color:var(--grey); }
</style>`;

app.post('/notificari', async (c) => {
  const form = await c.req.formData();
  const actiune = String(form.get('actiune') ?? '');
  let error = '';
  let success = '';

  if (actiune === 'emails') {
    const val = String(form.get('notif_admin_emails') ?? '').trim();
    const lista = val.split(/[,;\n]/).map((e) => e.trim()).filter(Boolean);
    const invalide = lista.filter((e) => !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e));
    if (invalide.length) error = 'Adrese invalide: ' + invalide.join(', ');
    else {
      await setSetare(c.env, 'notif_admin_emails', lista.join(', '));
      success = 'Adresele de admin au fost salvate.';
    }
  } else if (actiune === 'toggle') {
    const key = String(form.get('key') ?? '');
    if (NOTIF_EVENTS.some((e) => e.key === key)) {
      const s = await getSetari(c.env);
      const nou = notifActiv(s, key) ? '0' : '1';
      await setSetare(c.env, 'notif_' + key, nou);
      success = 'Setarea a fost actualizată.';
    }
  } else if (actiune === 'test') {
    const s = await getSetari(c.env);
    const to = String(form.get('test_email') ?? '').trim() || getAdminEmails(s, c.env)[0] || '';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
      error = 'Introdu o adresă de email validă pentru test.';
    } else {
      const html = emailTemplate('Email de test', '<p>Acesta este un email de test din panoul APG Garage.</p><p>Dacă l-ai primit, sistemul de notificări funcționează corect. ✅</p>');
      const r = await sendRaw(c.env, to, 'Test notificări — APG Garage', html);
      await ensureNotifLog(c.env);
      await c.env.DB.prepare('INSERT INTO notificari_log (tip, destinatar, subiect, status, eroare) VALUES (?, ?, ?, ?, ?)')
        .bind('test', to, 'Test notificări — APG Garage', r.ok ? 'trimis' : 'esuat', (r.error ?? '').slice(0, 400)).run();
      if (r.ok) success = 'Email de test trimis către ' + to + '. Verifică inboxul (și spam-ul).';
      else error = 'Trimiterea a eșuat: ' + (r.error ?? 'eroare necunoscută') + '. Verifică cheia RESEND_API_KEY și domeniul în Resend.';
    }
  } else if (actiune === 'goleste_jurnal') {
    await ensureNotifLog(c.env);
    await c.env.DB.prepare('DELETE FROM notificari_log').run();
    success = 'Jurnalul a fost golit.';
  }

  return renderNotificari(c, error, success);
});

app.get('/notificari', async (c) => renderNotificari(c, '', ''));

async function renderNotificari(c: AppContext, error: string, success: string) {
  const user = c.get('user')!;
  const s = await getSetari(c.env);
  const admini = getAdminEmails(s, c.env);

  await ensureNotifLog(c.env);
  const { results: jurnal } = await c.env.DB.prepare('SELECT * FROM notificari_log ORDER BY created_at DESC LIMIT 50').all<any>();

  const evClient = NOTIF_EVENTS.filter((e) => e.catre === 'client');
  const evAdmin = NOTIF_EVENTS.filter((e) => e.catre === 'admin');

  const rand = (e: typeof NOTIF_EVENTS[number]) => {
    const on = notifActiv(s, e.key);
    return `<div class="notif-row">
      <div class="nr-info"><div class="t">${esc(e.label)}</div><div class="d">${esc(e.descriere)}</div></div>
      <form method="POST"><input type="hidden" name="actiune" value="toggle"><input type="hidden" name="key" value="${esc(e.key)}">
        <button type="submit" class="toggle-btn ${on ? 'on' : 'off'}">${on ? '● Activ' : '○ Oprit'}</button>
      </form>
    </div>`;
  };

  const jurnalRows = (jurnal && jurnal.length)
    ? jurnal.map((l) => `<tr>
        <td style="white-space:nowrap;color:var(--grey);font-size:0.82rem;">${dtRo(l.created_at)}</td>
        <td style="font-size:0.82rem;">${esc(l.tip)}</td>
        <td style="font-size:0.82rem;">${esc(l.destinatar)}</td>
        <td><span class="badge-st st-${esc(l.status)}">${esc(l.status)}</span></td>
        <td style="font-size:0.78rem;color:var(--grey);max-width:220px;">${esc(l.eroare || '')}</td>
      </tr>`).join('')
    : `<tr><td colspan="5" style="text-align:center;color:var(--grey);padding:1.5rem;">Nicio notificare înregistrată încă.</td></tr>`;

  const body = `<div class="container" style="max-width:840px;">
    <div class="page-title">Notificări <span>email</span></div>
    <div class="page-subtitle">Controlează ce emailuri se trimit, către cine și verifică livrarea</div>
    ${error ? `<div class="alert alert-error">${esc(error)}</div>` : ''}
    ${success ? `<div class="alert alert-success">${esc(success)}</div>` : ''}

    <div class="notif-card">
      <h3>Test livrare</h3>
      <p class="hint">Provider activ: <strong style="color:${gmailConfigured(c.env) ? '#2ecc71' : '#3498db'}">${gmailConfigured(c.env) ? 'Gmail API (' + esc(c.env.GMAIL_SENDER || '') + ')' : (c.env.RESEND_API_KEY ? 'Resend (' + esc(c.env.MAIL_FROM) + ')' : 'NECONFIGURAT')}</strong>. Trimite un email de test ca să verifici că totul funcționează. Implicit folosește prima adresă de admin.</p>
      <form method="POST" style="display:flex;gap:0.6rem;flex-wrap:wrap;align-items:flex-end;">
        <input type="hidden" name="actiune" value="test">
        <div class="form-group" style="margin:0;flex:1;min-width:220px;"><label>Trimite testul către</label><input type="email" name="test_email" value="${esc(admini[0] ?? '')}" placeholder="email@exemplu.ro"></div>
        <button type="submit" class="btn btn-primary" style="margin-bottom:0;">Trimite email de test</button>
      </form>
    </div>

    <div class="notif-card">
      <h3>Destinatari admin</h3>
      <p class="hint">Adresele care primesc alertele de administrare (programări, mesaje, cereri). Poți pune mai multe, separate prin virgulă.</p>
      <form method="POST">
        <input type="hidden" name="actiune" value="emails">
        <div class="form-group" style="margin-bottom:0.8rem;"><textarea name="notif_admin_emails" rows="2" placeholder="contact@apg-garage.ro, alt@exemplu.ro">${esc(s.notif_admin_emails ?? '')}</textarea></div>
        <button type="submit" class="btn btn-primary">Salvează adresele</button>
      </form>
    </div>

    <div class="notif-card">
      <h3>Tipuri de notificări</h3>
      <p class="hint">Pornește sau oprește fiecare tip de email. Cele oprite nu se mai trimit, dar apar în jurnal ca „dezactivat".</p>
      <div class="grup-titlu">Către clienți</div>
      ${evClient.map(rand).join('')}
      <div class="grup-titlu" style="margin-top:1.2rem;">Către administrator</div>
      ${evAdmin.map(rand).join('')}
    </div>

    <div class="notif-card">
      <h3>Jurnal (ultimele 50)</h3>
      <p class="hint">Istoricul emailurilor procesate de sistem.</p>
      <div style="overflow-x:auto;"><table class="jurnal-tabel">
        <thead><tr><th>Data</th><th>Tip</th><th>Destinatar</th><th>Status</th><th>Detalii</th></tr></thead>
        <tbody>${jurnalRows}</tbody>
      </table></div>
      ${jurnal && jurnal.length ? `<form method="POST" onsubmit="return confirm('Golești tot jurnalul?')" style="margin-top:1rem;"><input type="hidden" name="actiune" value="goleste_jurnal"><button type="submit" class="btn btn-outline" style="font-size:0.8rem;">Golește jurnalul</button></form>` : ''}
    </div>
  </div>`;
  return c.html(page({ title: 'Notificări — Admin APG Garage', user, nav: 'admin', currentPath: '/admin/notificari', headExtra: STYLE, body }));
}

export default app;
