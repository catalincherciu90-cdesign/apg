import { Hono } from 'hono';
import type { Env, Variables, AppContext } from '../../types';
import { page } from '../../views/layout';
import { esc } from '../../lib/format';

const app = new Hono<{ Bindings: Env; Variables: Variables }>();

const STYLE = `<style>
    .stats-row { display:grid; grid-template-columns:repeat(5,1fr); gap:1rem; margin-bottom:2rem; }
    @media(max-width:700px){ .stats-row { grid-template-columns:repeat(3,1fr); } }
    .stat-card { background:var(--dark2); border:1px solid var(--border); padding:1rem; text-align:center; }
    .stat-card .num { font-family:'Barlow Condensed',sans-serif; font-size:2rem; font-weight:800; line-height:1; }
    .stat-card .lbl { font-size:0.7rem; color:var(--grey); letter-spacing:1px; text-transform:uppercase; margin-top:0.3rem; }
    .filters { display:flex; gap:0.5rem; flex-wrap:wrap; margin-bottom:1.5rem; }
    .filters a { padding:0.4rem 0.9rem; border:1px solid var(--border); color:var(--grey); text-decoration:none; font-size:0.8rem; font-weight:600; letter-spacing:1px; text-transform:uppercase; transition:all 0.15s; }
    .filters a:hover,.filters a.active { border-color:var(--red); color:var(--red); }
    .tractare-card { background:var(--dark2); border:1px solid var(--border); border-left:4px solid var(--border); padding:1.2rem 1.5rem; margin-bottom:1rem; }
    .tractare-card.asteptare { border-left-color:#f0a500; } .tractare-card.confirmat { border-left-color:#2ecc71; } .tractare-card.in_drum { border-left-color:#3498db; } .tractare-card.finalizat { border-left-color:var(--grey); } .tractare-card.anulat { border-left-color:var(--red); }
    .tc-header { display:flex; justify-content:space-between; align-items:flex-start; gap:1rem; margin-bottom:0.8rem; flex-wrap:wrap; }
    .tc-client { font-family:'Barlow Condensed',sans-serif; font-size:1.15rem; font-weight:700; letter-spacing:1px; }
    .tc-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(200px,1fr)); gap:0.5rem 1rem; margin-bottom:0.8rem; }
    .tc-row .lbl { font-size:0.68rem; font-weight:700; letter-spacing:1.5px; text-transform:uppercase; color:var(--grey); }
    .tc-row .val { font-size:0.88rem; color:var(--white); }
    .tc-locatie { background:var(--black); border:1px solid var(--border); padding:0.6rem 0.9rem; font-size:0.85rem; color:var(--grey-light); margin-bottom:0.8rem; }
    .tc-locatie strong { display:block; font-size:0.7rem; letter-spacing:1.5px; text-transform:uppercase; color:var(--grey); margin-bottom:0.2rem; }
    .tc-actions { display:flex; gap:0.5rem; flex-wrap:wrap; }
    .tc-actions button { padding:0.35rem 0.8rem; font-family:'Barlow Condensed',sans-serif; font-size:0.8rem; font-weight:700; letter-spacing:1px; text-transform:uppercase; cursor:pointer; border:1px solid; background:none; transition:all 0.15s; }
    .btn-confirma-t { border-color:#1e8449; color:#2ecc71; } .btn-confirma-t:hover { background:#1e8449; color:#fff; }
    .btn-drum { border-color:#1a6a9a; color:#3498db; } .btn-drum:hover { background:#1a6a9a; color:#fff; }
    .btn-final-t { border-color:var(--grey); color:var(--grey); } .btn-final-t:hover { background:var(--grey); color:#000; }
    .btn-anula { border-color:#333; color:#555; } .btn-anula:hover { border-color:var(--red); color:var(--red); }
</style>`;

const STATUS_LABEL: Record<string, string> = { asteptare: 'În așteptare', confirmat: 'Confirmat', in_drum: 'În drum', finalizat: 'Finalizat', anulat: 'Anulat' };
const STATUS_BADGE: Record<string, string> = { asteptare: 'badge-asteptare', confirmat: 'badge-confirmat', in_drum: 'badge-in_lucru', finalizat: 'badge-finalizat', anulat: 'badge-respins' };

function dtRo(s: string): string {
  const d = new Date(String(s).replace(' ', 'T') + 'Z');
  if (isNaN(d.getTime())) return esc(s);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(d.getUTCDate())}.${p(d.getUTCMonth() + 1)}.${d.getUTCFullYear()} ${p(d.getUTCHours())}:${p(d.getUTCMinutes())}`;
}

app.post('/tractari', async (c) => {
  const form = await c.req.formData();
  const actiune = String(form.get('actiune') ?? '');
  const id = parseInt(String(form.get('tractare_id') ?? '0'), 10);
  const map: Record<string, string> = { confirma: 'confirmat', in_drum: 'in_drum', finalizeaza: 'finalizat', anuleaza: 'anulat' };
  let success = '';
  if (map[actiune]) {
    await c.env.DB.prepare('UPDATE tractari SET status=? WHERE id=?').bind(map[actiune], id).run();
    success = 'Status actualizat.';
  }
  return render(c, success);
});

app.get('/tractari', async (c) => render(c, ''));

async function render(c: AppContext, success: string) {
  const user = c.get('user')!;
  const filter = c.req.query('status') ?? 'toate';
  const sql = filter !== 'toate'
    ? 'SELECT * FROM tractari WHERE status = ? ORDER BY created_at DESC'
    : 'SELECT * FROM tractari ORDER BY created_at DESC';
  const stmt = filter !== 'toate' ? c.env.DB.prepare(sql).bind(filter) : c.env.DB.prepare(sql);
  const { results: tractari } = await stmt.all();

  const { results: statRows } = await c.env.DB.prepare('SELECT status, COUNT(*) as cnt FROM tractari GROUP BY status').all<{ status: string; cnt: number }>();
  const stats: Record<string, number> = {};
  for (const r of statRows ?? []) stats[r.status] = r.cnt;

  const filterLinks = Object.entries({ toate: 'Toate', asteptare: 'Așteptare', confirmat: 'Confirmate', in_drum: 'În drum', finalizat: 'Finalizate', anulat: 'Anulate' })
    .map(([k, v]) => `<a href="?status=${k}" class="${filter === k ? 'active' : ''}">${v}</a>`).join('');

  let lista: string;
  if (!tractari || tractari.length === 0) {
    lista = `<div class="card" style="text-align:center;color:var(--grey);padding:2rem;">Nicio cerere de tractare găsită.</div>`;
  } else {
    lista = tractari.map((t: any) => {
      let actiuni = '';
      if (t.status === 'asteptare') actiuni += `<button type="submit" name="actiune" value="confirma" class="btn-confirma-t">Confirmă</button>`;
      if (t.status === 'confirmat') actiuni += `<button type="submit" name="actiune" value="in_drum" class="btn-drum">În drum</button>`;
      if (t.status === 'in_drum') actiuni += `<button type="submit" name="actiune" value="finalizeaza" class="btn-final-t">Finalizat</button>`;
      if (!['finalizat', 'anulat'].includes(t.status)) actiuni += `<button type="submit" name="actiune" value="anuleaza" class="btn-anula" onclick="return confirm('Anulezi cererea?')">Anulează</button>`;
      return `<div class="tractare-card ${t.status}">
        <div class="tc-header"><div><div class="tc-client">${esc(t.nume)}</div><div style="color:var(--grey);font-size:0.85rem;">${dtRo(t.created_at)}</div></div><span class="badge ${STATUS_BADGE[t.status] ?? ''}">${STATUS_LABEL[t.status] ?? t.status}</span></div>
        <div class="tc-locatie"><strong>Locație</strong>${esc(t.locatie)}<a href="https://maps.google.com/?q=${encodeURIComponent(t.locatie ?? '')}" target="_blank" style="color:var(--red);font-size:0.78rem;margin-left:0.5rem;">→ Maps</a></div>
        <div class="tc-grid">
            <div class="tc-row"><div class="lbl">Telefon</div><div class="val"><a href="tel:${esc(t.telefon)}" style="color:var(--white);text-decoration:none;">${esc(t.telefon)}</a></div></div>
            ${t.nr_inmatriculare ? `<div class="tc-row"><div class="lbl">Mașina</div><div class="val">${esc(t.nr_inmatriculare + ' ' + (t.producator ?? '') + ' ' + (t.model ?? ''))}</div></div>` : ''}
            ${t.descriere_problema ? `<div class="tc-row" style="grid-column:1/-1;"><div class="lbl">Problemă</div><div class="val">${esc(t.descriere_problema)}</div></div>` : ''}
        </div>
        <div class="tc-actions"><form method="POST" style="display:contents;"><input type="hidden" name="tractare_id" value="${t.id}">${actiuni}</form></div>
      </div>`;
    }).join('');
  }

  const body = `<div class="container">
    <div class="page-title">Tractări <span>auto</span></div>
    <div class="page-subtitle">Gestionează cererile de tractare</div>
    ${success ? `<div class="alert alert-success">${esc(success)}</div>` : ''}
    <div class="stats-row">
        <div class="stat-card"><div class="num" style="color:#f0a500">${stats.asteptare ?? 0}</div><div class="lbl">Așteptare</div></div>
        <div class="stat-card"><div class="num" style="color:#2ecc71">${stats.confirmat ?? 0}</div><div class="lbl">Confirmate</div></div>
        <div class="stat-card"><div class="num" style="color:#3498db">${stats.in_drum ?? 0}</div><div class="lbl">În drum</div></div>
        <div class="stat-card"><div class="num" style="color:var(--grey)">${stats.finalizat ?? 0}</div><div class="lbl">Finalizate</div></div>
        <div class="stat-card"><div class="num" style="color:var(--red)">${stats.anulat ?? 0}</div><div class="lbl">Anulate</div></div>
    </div>
    <div class="filters">${filterLinks}</div>
    ${lista}
  </div>`;
  return c.html(page({ title: 'Tractări — Admin APG Garage', user, nav: 'admin', currentPath: '/admin/tractari', headExtra: STYLE, body }));
}

export default app;
