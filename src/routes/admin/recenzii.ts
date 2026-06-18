import { Hono } from 'hono';
import type { Env, Variables, AppContext } from '../../types';
import { page } from '../../views/layout';
import { esc } from '../../lib/format';
import { ensureRecenzii, stele } from '../../lib/recenzii';

const app = new Hono<{ Bindings: Env; Variables: Variables }>();

const STYLE = `<style>
    .adauga-form { background:var(--dark2); border:1px solid var(--border); border-top:4px solid var(--red); padding:1.5rem; margin-bottom:2rem; }
    .adauga-form h3 { font-family:'Barlow Condensed',sans-serif; font-size:1.15rem; font-weight:700; text-transform:uppercase; letter-spacing:1px; margin-bottom:1rem; }
    .fg3 { display:grid; grid-template-columns:2fr 1fr 1fr; gap:0 1rem; } @media(max-width:600px){ .fg3 { grid-template-columns:1fr; } }
    .rec-card { background:var(--dark2); border:1px solid var(--border); border-left:4px solid; padding:1.1rem 1.4rem; margin-bottom:0.9rem; }
    .rec-card.activa { border-left-color:#2ecc71; } .rec-card.inactiva { border-left-color:#444; opacity:0.6; }
    .rec-head { display:flex; justify-content:space-between; align-items:flex-start; gap:1rem; flex-wrap:wrap; margin-bottom:0.4rem; }
    .rec-nume { font-family:'Barlow Condensed',sans-serif; font-size:1.1rem; font-weight:700; letter-spacing:0.5px; }
    .rec-stele { color:#f0a500; letter-spacing:2px; }
    .rec-text { color:var(--grey-light); font-size:0.9rem; line-height:1.6; margin-bottom:0.7rem; }
    .rec-actions { display:flex; gap:0.5rem; flex-wrap:wrap; }
    .rec-actions button { padding:0.32rem 0.8rem; font-family:'Barlow Condensed',sans-serif; font-size:0.78rem; font-weight:700; letter-spacing:1px; text-transform:uppercase; cursor:pointer; border:1px solid; background:none; transition:all 0.15s; }
    .btn-tg { border-color:#1e8449; color:#2ecc71; } .btn-tg:hover { background:#1e8449; color:#fff; }
    .btn-tg.off { border-color:#444; color:#777; } .btn-tg.off:hover { background:#444; color:#fff; }
    .btn-del { border-color:#333; color:#555; } .btn-del:hover { border-color:var(--red); color:var(--red); }
</style>`;

app.post('/recenzii', async (c) => {
  await ensureRecenzii(c.env);
  const form = await c.req.formData();
  const actiune = String(form.get('actiune') ?? '');
  if (actiune === 'adauga') {
    const nume = String(form.get('nume') ?? '').trim();
    const text = String(form.get('text') ?? '').trim();
    const rating = Math.max(1, Math.min(5, parseInt(String(form.get('rating') ?? '5'), 10) || 5));
    const ordine = parseInt(String(form.get('ordine') ?? '0'), 10) || 0;
    if (nume && text) {
      await c.env.DB.prepare('INSERT INTO recenzii (nume, rating, text, ordine) VALUES (?, ?, ?, ?)').bind(nume, rating, text, ordine).run();
    }
  } else if (actiune === 'toggle') {
    await c.env.DB.prepare('UPDATE recenzii SET activ = 1 - activ WHERE id = ?').bind(parseInt(String(form.get('id') ?? '0'), 10)).run();
  } else if (actiune === 'sterge') {
    await c.env.DB.prepare('DELETE FROM recenzii WHERE id = ?').bind(parseInt(String(form.get('id') ?? '0'), 10)).run();
  }
  return c.redirect('/admin/recenzii');
});

app.get('/recenzii', async (c) => renderRecenzii(c));

async function renderRecenzii(c: AppContext) {
  const user = c.get('user')!;
  await ensureRecenzii(c.env);
  const { results: recenzii } = await c.env.DB.prepare('SELECT * FROM recenzii ORDER BY ordine ASC, created_at DESC').all<any>();

  const lista = (recenzii && recenzii.length)
    ? recenzii.map((r) => `<div class="rec-card ${r.activ ? 'activa' : 'inactiva'}">
        <div class="rec-head">
          <div><div class="rec-nume">${esc(r.nume)}</div><div class="rec-stele">${stele(r.rating)}</div></div>
          <div class="rec-actions">
            <form method="POST"><input type="hidden" name="actiune" value="toggle"><input type="hidden" name="id" value="${r.id}"><button type="submit" class="btn-tg ${r.activ ? '' : 'off'}">${r.activ ? '● Activă' : '○ Ascunsă'}</button></form>
            <form method="POST" onsubmit="return confirm('Ștergi recenzia?')"><input type="hidden" name="actiune" value="sterge"><input type="hidden" name="id" value="${r.id}"><button type="submit" class="btn-del">Șterge</button></form>
          </div>
        </div>
        <div class="rec-text">${esc(r.text)}</div>
      </div>`).join('')
    : `<div class="card" style="text-align:center;color:var(--grey);padding:2rem;">Nicio recenzie adăugată încă.</div>`;

  const body = `<div class="container" style="max-width:780px;">
    <div class="page-title">Recenzii <span>clienți</span></div>
    <div class="page-subtitle">Testimoniale afișate pe pagina principală</div>
    <div class="adauga-form"><h3>+ Adaugă recenzie</h3>
      <form method="POST">
        <input type="hidden" name="actiune" value="adauga">
        <div class="fg3">
          <div class="form-group"><label>Nume client *</label><input type="text" name="nume" placeholder="ex: Andrei M." required></div>
          <div class="form-group"><label>Rating</label><select name="rating"><option value="5">★★★★★ (5)</option><option value="4">★★★★ (4)</option><option value="3">★★★ (3)</option><option value="2">★★ (2)</option><option value="1">★ (1)</option></select></div>
          <div class="form-group"><label>Ordine</label><input type="number" name="ordine" value="0"></div>
        </div>
        <div class="form-group"><label>Text recenzie *</label><textarea name="text" rows="3" placeholder="Ce a spus clientul..." required></textarea></div>
        <button type="submit" class="btn btn-primary">Adaugă recenzia</button>
      </form>
    </div>
    ${lista}
  </div>`;
  return c.html(page({ title: 'Recenzii — Admin APG Garage', user, nav: 'admin', currentPath: '/admin/recenzii', headExtra: STYLE, body }));
}

export default app;
