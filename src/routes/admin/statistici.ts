import { Hono } from 'hono';
import type { Env, Variables, AppContext } from '../../types';
import { page } from '../../views/layout';
import { esc, numberFormat, serviciuLabel } from '../../lib/format';
import { ensureDevizDecizie } from '../../lib/deviz';

const app = new Hono<{ Bindings: Env; Variables: Variables }>();

const LUNI_RO = ['Ian', 'Feb', 'Mar', 'Apr', 'Mai', 'Iun', 'Iul', 'Aug', 'Sep', 'Oct', 'Noi', 'Dec'];

const STYLE = `<style>
    .stat-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(170px,1fr)); gap:1rem; margin-bottom:2rem; }
    .stat-box { background:var(--dark2); border:1px solid var(--border); border-top:3px solid var(--red); padding:1.3rem; }
    .stat-box .num { font-family:'Barlow Condensed',sans-serif; font-size:2.2rem; font-weight:800; line-height:1; }
    .stat-box .lbl { font-size:0.72rem; color:var(--grey); letter-spacing:1px; text-transform:uppercase; margin-top:0.4rem; }
    .stat-box .sub { font-size:0.78rem; color:var(--grey); margin-top:0.3rem; }
    .panel { background:var(--dark2); border:1px solid var(--border); padding:1.5rem; margin-bottom:1.5rem; }
    .panel h3 { font-family:'Barlow Condensed',sans-serif; font-size:1.15rem; font-weight:700; text-transform:uppercase; letter-spacing:1px; margin-bottom:1.2rem; }
    .bars { display:flex; align-items:flex-end; gap:0.6rem; height:180px; }
    .bar-col { flex:1; display:flex; flex-direction:column; align-items:center; justify-content:flex-end; height:100%; }
    .bar { width:100%; max-width:48px; background:linear-gradient(180deg,var(--red),#7a1f17); min-height:3px; border-radius:3px 3px 0 0; transition:height .3s; }
    .bar-val { font-family:'Barlow Condensed',sans-serif; font-weight:700; font-size:0.9rem; margin-bottom:0.3rem; }
    .bar-lbl { font-size:0.72rem; color:var(--grey); margin-top:0.4rem; text-align:center; }
    .hbar-row { display:flex; align-items:center; gap:0.8rem; margin-bottom:0.7rem; }
    .hbar-lbl { width:150px; font-size:0.85rem; color:var(--grey-light); flex-shrink:0; text-align:right; }
    .hbar-track { flex:1; background:var(--black); height:22px; border:1px solid var(--border); position:relative; }
    .hbar-fill { height:100%; background:linear-gradient(90deg,#7a1f17,var(--red)); }
    .hbar-num { font-family:'Barlow Condensed',sans-serif; font-weight:700; font-size:0.85rem; width:36px; }
</style>`;

app.get('/statistici', async (c) => renderStatistici(c));

async function renderStatistici(c: AppContext) {
  const user = c.get('user')!;
  const db = c.env.DB;
  await ensureDevizDecizie(c.env);

  const { results: statRows } = await db.prepare('SELECT status, COUNT(*) AS c FROM rezervari GROUP BY status').all<any>();
  const st: Record<string, number> = {};
  for (const r of statRows ?? []) st[r.status] = r.c;
  const totalProg = Object.values(st).reduce((a, b) => a + b, 0);

  const clienti = (await db.prepare(`SELECT COUNT(*) AS n FROM users WHERE rol='client'`).first<any>())?.n ?? 0;
  const masini = (await db.prepare('SELECT COUNT(*) AS n FROM masini').first<any>())?.n ?? 0;

  const venitTotal = (await db.prepare(`SELECT IFNULL(SUM(dr.total),0) AS s FROM deviz_randuri dr JOIN devize d ON d.id = dr.deviz_id WHERE d.status='trimis'`).first<any>())?.s ?? 0;
  const venitLuna = (await db.prepare(`SELECT IFNULL(SUM(dr.total),0) AS s FROM deviz_randuri dr JOIN devize d ON d.id = dr.deviz_id WHERE d.status='trimis' AND strftime('%Y-%m', d.updated_at) = strftime('%Y-%m','now')`).first<any>())?.s ?? 0;

  // Programări pe ultimele 6 luni
  const { results: luniRows } = await db.prepare(
    `SELECT strftime('%Y-%m', data) AS ym, COUNT(*) AS c FROM rezervari WHERE data >= date('now','-5 months','start of month') GROUP BY ym`,
  ).all<any>();
  const lunaMap: Record<string, number> = {};
  for (const r of luniRows ?? []) lunaMap[r.ym] = r.c;
  const now = new Date();
  const buckets: { lbl: string; val: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    const ym = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
    buckets.push({ lbl: LUNI_RO[d.getUTCMonth()], val: lunaMap[ym] ?? 0 });
  }
  const maxLuna = Math.max(1, ...buckets.map((b) => b.val));

  // Top servicii
  const { results: servRows } = await db.prepare('SELECT serviciu_tip, COUNT(*) AS c FROM rezervari GROUP BY serviciu_tip ORDER BY c DESC LIMIT 6').all<any>();
  const maxServ = Math.max(1, ...(servRows ?? []).map((r) => r.c));

  // Decizii deviz
  const { results: decRows } = await db.prepare(`SELECT decizie, COUNT(*) AS c FROM devize WHERE status='trimis' GROUP BY decizie`).all<any>();
  const dec: Record<string, number> = { aprobat: 0, respins: 0, asteptare: 0 };
  for (const r of decRows ?? []) dec[r.decizie === 'aprobat' ? 'aprobat' : r.decizie === 'respins' ? 'respins' : 'asteptare'] += r.c;

  const barsHtml = buckets.map((b) => `<div class="bar-col"><div class="bar-val">${b.val}</div><div class="bar" style="height:${(b.val / maxLuna) * 100}%"></div><div class="bar-lbl">${b.lbl}</div></div>`).join('');
  const servHtml = (servRows ?? []).length
    ? (servRows ?? []).map((r) => `<div class="hbar-row"><div class="hbar-lbl">${esc(serviciuLabel(r.serviciu_tip))}</div><div class="hbar-track"><div class="hbar-fill" style="width:${(r.c / maxServ) * 100}%"></div></div><div class="hbar-num">${r.c}</div></div>`).join('')
    : '<p style="color:var(--grey);">Nicio programare încă.</p>';

  const body = `<div class="container" style="max-width:900px;">
    <div class="page-title">Statistici</div>
    <div class="page-subtitle">Imagine de ansamblu asupra activității</div>

    <div class="stat-grid">
      <div class="stat-box"><div class="num">${totalProg}</div><div class="lbl">Total programări</div><div class="sub">${st.asteptare ?? 0} în așteptare</div></div>
      <div class="stat-box"><div class="num" style="color:#2ecc71">${st.finalizat ?? 0}</div><div class="lbl">Finalizate</div></div>
      <div class="stat-box"><div class="num">${clienti}</div><div class="lbl">Clienți</div><div class="sub">${masini} mașini</div></div>
      <div class="stat-box"><div class="num" style="color:var(--red)">${numberFormat(venitTotal, 0)}</div><div class="lbl">Lei facturați</div><div class="sub">${numberFormat(venitLuna, 0)} lei luna aceasta</div></div>
    </div>

    <div class="panel"><h3>Programări — ultimele 6 luni</h3><div class="bars">${barsHtml}</div></div>

    <div class="panel"><h3>Top servicii</h3>${servHtml}</div>

    <div class="panel"><h3>Devize trimise</h3>
      <div class="stat-grid" style="margin-bottom:0;">
        <div class="stat-box" style="border-top-color:#2ecc71"><div class="num" style="color:#2ecc71">${dec.aprobat}</div><div class="lbl">Aprobate</div></div>
        <div class="stat-box" style="border-top-color:var(--red)"><div class="num" style="color:#e74c3c">${dec.respins}</div><div class="lbl">Respinse</div></div>
        <div class="stat-box" style="border-top-color:#f0a500"><div class="num" style="color:#f0a500">${dec.asteptare}</div><div class="lbl">În așteptare</div></div>
      </div>
    </div>
  </div>`;
  return c.html(page({ title: 'Statistici — Admin APG Garage', user, nav: 'admin', currentPath: '/admin/statistici', headExtra: STYLE, body }));
}

export default app;
