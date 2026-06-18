import { Hono } from 'hono';
import type { Env, Variables, AppContext } from '../../types';
import { page } from '../../views/layout';
import { esc, nl2br } from '../../lib/format';
import { ensureMesaje } from '../../lib/mesaje';

const app = new Hono<{ Bindings: Env; Variables: Variables }>();

function dtRo(s: string): string {
  const d = new Date(String(s).replace(' ', 'T') + 'Z');
  if (isNaN(d.getTime())) return esc(s);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(d.getUTCDate())}.${p(d.getUTCMonth() + 1)}.${d.getUTCFullYear()} ${p(d.getUTCHours())}:${p(d.getUTCMinutes())}`;
}

const MESAJE_STYLE = `<style>
    .msg-card { background:var(--dark2); border:1px solid var(--border); border-left:4px solid var(--border); padding:1.2rem 1.5rem; margin-bottom:1rem; }
    .msg-card.nou { border-left-color:var(--red); background:linear-gradient(90deg, rgba(192,57,43,0.06), var(--dark2) 40%); }
    .msg-head { display:flex; justify-content:space-between; align-items:flex-start; gap:1rem; flex-wrap:wrap; margin-bottom:0.6rem; }
    .msg-nume { font-family:'Barlow Condensed',sans-serif; font-size:1.2rem; font-weight:700; letter-spacing:1px; }
    .msg-nume .nou-tag { font-family:'Barlow',sans-serif; font-size:0.65rem; font-weight:700; letter-spacing:1.5px; text-transform:uppercase; color:#fff; background:var(--red); padding:0.12rem 0.5rem; margin-left:0.6rem; vertical-align:middle; }
    .msg-date { color:var(--grey); font-size:0.8rem; white-space:nowrap; }
    .msg-meta { color:var(--grey-light); font-size:0.88rem; margin-bottom:0.8rem; display:flex; gap:1.2rem; flex-wrap:wrap; }
    .msg-meta a { color:var(--grey-light); text-decoration:none; } .msg-meta a:hover { color:var(--red); }
    .msg-body { color:var(--white); font-size:0.92rem; line-height:1.6; padding:0.9rem 1rem; background:var(--black); border:1px solid var(--border); margin-bottom:0.9rem; }
    .msg-actions { display:flex; gap:0.5rem; flex-wrap:wrap; }
    .msg-actions button, .msg-actions a { padding:0.35rem 0.9rem; font-family:'Barlow Condensed',sans-serif; font-size:0.8rem; font-weight:700; letter-spacing:1px; text-transform:uppercase; cursor:pointer; border:1px solid; background:none; text-decoration:none; transition:all 0.15s; }
    .btn-reply { border-color:#1a6a9a; color:#3498db; } .btn-reply:hover { background:#1a6a9a; color:#fff; }
    .btn-citit { border-color:#1e8449; color:#2ecc71; } .btn-citit:hover { background:#1e8449; color:#fff; }
    .btn-necitit { border-color:var(--border); color:var(--grey); } .btn-necitit:hover { border-color:var(--white); color:var(--white); }
    .btn-del { border-color:#333; color:#555; } .btn-del:hover { border-color:var(--red); color:var(--red); }
</style>`;

app.post('/mesaje', async (c) => {
  await ensureMesaje(c.env);
  const form = await c.req.formData();
  const actiune = String(form.get('actiune') ?? '');
  const id = parseInt(String(form.get('mesaj_id') ?? '0'), 10);
  if (id) {
    if (actiune === 'citit') await c.env.DB.prepare('UPDATE mesaje SET citit = 1 WHERE id = ?').bind(id).run();
    else if (actiune === 'necitit') await c.env.DB.prepare('UPDATE mesaje SET citit = 0 WHERE id = ?').bind(id).run();
    else if (actiune === 'sterge') await c.env.DB.prepare('DELETE FROM mesaje WHERE id = ?').bind(id).run();
  }
  return c.redirect('/admin/mesaje');
});

app.get('/mesaje', async (c) => renderMesaje(c));

async function renderMesaje(c: AppContext) {
  const user = c.get('user')!;
  await ensureMesaje(c.env);
  const { results: mesaje } = await c.env.DB.prepare('SELECT * FROM mesaje ORDER BY citit ASC, created_at DESC').all<any>();
  const necitite = (mesaje ?? []).filter((m) => !m.citit).length;

  let lista: string;
  if (!mesaje || mesaje.length === 0) {
    lista = `<div class="card" style="text-align:center;padding:2.5rem;color:var(--grey);">Niciun mesaj primit deocamdată.</div>`;
  } else {
    lista = mesaje.map((m) => {
      const telClean = String(m.telefon ?? '').replace(/\s+/g, '');
      const subject = encodeURIComponent('Re: mesajul tău către APG Garage');
      return `<div class="msg-card ${m.citit ? '' : 'nou'}">
        <div class="msg-head">
          <div class="msg-nume">${esc(m.nume)}${m.citit ? '' : '<span class="nou-tag">Nou</span>'}</div>
          <div class="msg-date">${dtRo(m.created_at)}</div>
        </div>
        <div class="msg-meta">
          <span>✉️ <a href="mailto:${esc(m.email)}">${esc(m.email)}</a></span>
          ${m.telefon ? `<span>📞 <a href="tel:${esc(telClean)}">${esc(m.telefon)}</a></span>` : ''}
        </div>
        <div class="msg-body">${nl2br(m.mesaj)}</div>
        <div class="msg-actions">
          <a class="btn-reply" href="mailto:${esc(m.email)}?subject=${subject}">Răspunde</a>
          ${m.citit
            ? `<form method="POST"><input type="hidden" name="mesaj_id" value="${m.id}"><input type="hidden" name="actiune" value="necitit"><button type="submit" class="btn-necitit">Marchează necitit</button></form>`
            : `<form method="POST"><input type="hidden" name="mesaj_id" value="${m.id}"><input type="hidden" name="actiune" value="citit"><button type="submit" class="btn-citit">Marchează citit</button></form>`}
          <form method="POST" onsubmit="return confirm('Ștergi definitiv acest mesaj?')"><input type="hidden" name="mesaj_id" value="${m.id}"><input type="hidden" name="actiune" value="sterge"><button type="submit" class="btn-del">Șterge</button></form>
        </div>
      </div>`;
    }).join('');
  }

  const body = `<div class="container" style="max-width:820px;">
    <div class="page-title">Mesaje${necitite ? ` <span>(${necitite} noi)</span>` : ''}</div>
    <div class="page-subtitle">Mesajele primite prin formularul de contact</div>
    ${lista}
  </div>`;
  return c.html(page({ title: 'Mesaje — Admin APG Garage', user, nav: 'admin', currentPath: '/admin/mesaje', headExtra: MESAJE_STYLE, body }));
}

export default app;
