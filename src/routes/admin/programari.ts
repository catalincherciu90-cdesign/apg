import { Hono } from 'hono';
import type { Env, Variables, AppContext } from '../../types';
import { page } from '../../views/layout';
import { esc, dateRo, timeShort, serviciuLabel, STATUS_LABEL, todayRo, addDays } from '../../lib/format';
import { hashPassword } from '../../lib/password';
import { ensureRampaColumns } from '../../lib/masini';

const app = new Hono<{ Bindings: Env; Variables: Variables }>();

const INDEX_STYLE = `<style>
    .stats-row { display: grid; grid-template-columns: repeat(5, 1fr); gap: 1rem; margin-bottom: 2rem; }
    @media (max-width: 700px) { .stats-row { grid-template-columns: repeat(3, 1fr); gap: 0.6rem; } }
    @media (max-width: 400px) { .stats-row { grid-template-columns: repeat(2, 1fr); } }
    .stat-card { background: var(--dark2); border: 1px solid var(--border); padding: 1rem; text-align: center; }
    .stat-card .num { font-family: 'Barlow Condensed', sans-serif; font-size: 2rem; font-weight: 800; line-height: 1; }
    .stat-card .lbl { font-size: 0.7rem; color: var(--grey); letter-spacing: 1px; text-transform: uppercase; margin-top: 0.3rem; }
    .filters { display: flex; gap: 0.5rem; margin-bottom: 1.5rem; flex-wrap: wrap; align-items: center; }
    .filters a { padding: 0.4rem 0.8rem; border: 1px solid var(--border); color: var(--grey); text-decoration: none; font-size: 0.8rem; font-weight: 600; letter-spacing: 1px; text-transform: uppercase; transition: all 0.15s; }
    .filters a:hover, .filters a.active { border-color: var(--red); color: var(--red); }
    .filters input[type=date] { background: var(--black); border: 1px solid var(--border); color: var(--white); padding: 0.4rem 0.8rem; font-family: 'Barlow', sans-serif; font-size: 0.9rem; }
    .action-btns { display: flex; gap: 0.5rem; flex-wrap: wrap; }
    .action-btns button { padding: 0.3rem 0.8rem; font-size: 0.8rem; cursor: pointer; font-family: 'Barlow Condensed', sans-serif; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; border: 1px solid; transition: all 0.15s; background: none; }
    .btn-confirma { border-color: #1e8449; color: #1e8449; } .btn-confirma:hover { background: #1e8449; color: #fff; }
    .btn-inlucru { border-color: #1a6a9a; color: #1a6a9a; } .btn-inlucru:hover { background: #1a6a9a; color: #fff; }
    .btn-final { border-color: var(--grey); color: var(--grey); } .btn-final:hover { background: var(--grey); color: #000; }
    .btn-respinge { border-color: var(--danger); color: var(--danger); } .btn-respinge:hover { background: var(--danger); color: #fff; }
    .tabel-desktop { display: block; } .carduri-mobile { display: none; }
    .admin-card { background: var(--dark2); border: 1px solid var(--border); border-left: 4px solid var(--border); padding: 1.2rem; margin-bottom: 1rem; }
    .admin-card.status-asteptare { border-left-color: #f0a500; } .admin-card.status-confirmat { border-left-color: #2ecc71; } .admin-card.status-respins { border-left-color: var(--red); } .admin-card.status-in_lucru { border-left-color: #3498db; } .admin-card.status-finalizat { border-left-color: var(--grey); }
    .admin-card-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.8rem; gap: 0.5rem; }
    .admin-card-masina { font-family: 'Barlow Condensed', sans-serif; font-size: 1.15rem; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; }
    .admin-card-masina small { display: block; font-family: 'Barlow', sans-serif; font-size: 0.8rem; font-weight: 400; color: var(--grey); text-transform: none; letter-spacing: 0; }
    .admin-card-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem 1rem; margin-bottom: 0.8rem; }
    .admin-card-row { display: flex; flex-direction: column; gap: 0.1rem; }
    .admin-card-row .lbl { font-size: 0.68rem; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase; color: var(--grey); }
    .admin-card-row .val { color: var(--white); font-size: 0.88rem; }
    .admin-card-row .val small { color: var(--grey); font-size: 0.78rem; display: block; }
    .admin-card-descriere { font-size: 0.83rem; color: var(--grey); padding: 0.7rem 0; border-top: 1px solid var(--border); border-bottom: 1px solid var(--border); margin-bottom: 0.8rem; }
    .admin-card-actions { display: flex; gap: 0.5rem; }
    .admin-card-actions form { flex: 1; }
    .admin-card-actions button { width: 100%; padding: 0.55rem 0.5rem; font-size: 0.85rem; cursor: pointer; font-family: 'Barlow Condensed', sans-serif; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; border: 1px solid; transition: all 0.15s; background: none; }
    .modal { display:none; position:fixed; inset:0; background:rgba(0,0,0,0.85); z-index:999; align-items:center; justify-content:center; padding: 1rem; }
    .modal.open { display:flex; }
    .modal-box { background: var(--dark2); border: 1px solid var(--border); padding: 1.5rem; width: 100%; max-width: 420px; }
    .modal-box h3 { font-family:'Barlow Condensed',sans-serif; font-size:1.4rem; font-weight:800; text-transform:uppercase; margin-bottom:1rem; }
    @media (max-width: 750px) { .tabel-desktop { display: none; } .carduri-mobile { display: block; } }
</style>`;

app.post('/', async (c) => {
  const form = await c.req.formData();
  const id = parseInt(String(form.get('rez_id') ?? '0'), 10);
  const act = String(form.get('actiune') ?? '');
  const motiv = String(form.get('motiv') ?? '').trim();
  const map: Record<string, string> = { confirma: 'confirmat', respinge: 'respins', in_lucru: 'in_lucru', finalizeaza: 'finalizat' };
  if (map[act] && id) {
    if (act === 'respinge') {
      await c.env.DB.prepare('UPDATE rezervari SET status = ?, motiv_respingere = ? WHERE id = ?').bind(map[act], motiv, id).run();
    } else {
      await c.env.DB.prepare('UPDATE rezervari SET status = ? WHERE id = ?').bind(map[act], id).run();
      // La finalizarea unei revizii/verificări de rampă, actualizează automat
      // data ultimei lucrări pe mașină (resetează countdown-ul și reminderul).
      // Doar dacă programarea e mai nouă decât data curentă.
      if (act === 'finalizeaza') {
        const rez = await c.env.DB.prepare('SELECT user_id, nr_inmatriculare, serviciu_tip, data FROM rezervari WHERE id = ?').bind(id).first<any>();
        if (rez && rez.nr_inmatriculare) {
          const tip = String(rez.serviciu_tip ?? '');
          const dataLucr = String(rez.data).slice(0, 10);
          if (/reviz/i.test(tip)) {
            await c.env.DB.prepare(
              `UPDATE masini SET data_ultima_revizie = ?, notificare_trimisa = 0
               WHERE user_id = ? AND REPLACE(UPPER(nr_inmatriculare), ' ', '') = REPLACE(UPPER(?), ' ', '')
                 AND (data_ultima_revizie IS NULL OR data_ultima_revizie < ?)`,
            ).bind(dataLucr, rez.user_id, rez.nr_inmatriculare, dataLucr).run();
          }
          if (/ramp/i.test(tip)) {
            await ensureRampaColumns(c.env);
            await c.env.DB.prepare(
              `UPDATE masini SET data_ultima_rampa = ?, notif_rampa_trimisa = 0
               WHERE user_id = ? AND REPLACE(UPPER(nr_inmatriculare), ' ', '') = REPLACE(UPPER(?), ' ', '')
                 AND (data_ultima_rampa IS NULL OR data_ultima_rampa < ?)`,
            ).bind(dataLucr, rez.user_id, rez.nr_inmatriculare, dataLucr).run();
          }
        }
      }
    }
  }
  return c.redirect('/admin');
});

app.get('/', async (c) => {
  const user = c.get('user')!;
  const filterStatus = c.req.query('status') ?? 'toate';
  const filterData = c.req.query('data') ?? '';

  const where: string[] = ['1=1'];
  const params: any[] = [];
  if (filterStatus !== 'toate') { where.push('r.status = ?'); params.push(filterStatus); }
  if (filterData) { where.push('r.data = ?'); params.push(filterData); }

  const { results: rezervari } = await c.env.DB.prepare(
    `SELECT r.*, u.nume as client_nume, u.telefon as client_telefon, u.email as client_email
     FROM rezervari r JOIN users u ON u.id = r.user_id
     WHERE ${where.join(' AND ')} ORDER BY r.data ASC, r.ora_start ASC`,
  ).bind(...params).all<any>();

  const { results: statRows } = await c.env.DB.prepare('SELECT status, COUNT(*) as cnt FROM rezervari GROUP BY status').all<{ status: string; cnt: number }>();
  const stats: Record<string, number> = {};
  for (const r of statRows ?? []) stats[r.status] = r.cnt;

  const statuses: Record<string, string> = { toate: 'Toate', asteptare: 'Așteptare', confirmat: 'Confirmate', in_lucru: 'În lucru', finalizat: 'Finalizate', respins: 'Respinse' };
  const filterLinks = Object.entries(statuses).map(([k, v]) => {
    const url = '/admin?status=' + k + (filterData ? '&data=' + filterData : '');
    return `<a href="${url}" class="${filterStatus === k ? 'active' : ''}">${v}</a>`;
  }).join('');

  const actiuni = (r: any, mobile = false) => {
    let h = '';
    if (r.status === 'asteptare') {
      h += `<form method="POST"${mobile ? '' : ''}><input type="hidden" name="rez_id" value="${r.id}"><input type="hidden" name="actiune" value="confirma"><button type="submit" class="btn-confirma">Confirmă</button></form>`;
      h += `<button class="btn-respinge" onclick="openRespinge(${r.id})"${mobile ? ' style="flex:1;padding:0.55rem;"' : ''}>Respinge</button>`;
    }
    if (r.status === 'confirmat') h += `<form method="POST"${mobile ? ' style="flex:1;"' : ''}><input type="hidden" name="rez_id" value="${r.id}"><input type="hidden" name="actiune" value="in_lucru"><button type="submit" class="btn-inlucru"${mobile ? ' style="width:100%;"' : ''}>În lucru</button></form>`;
    if (r.status === 'in_lucru') h += `<form method="POST"${mobile ? ' style="flex:1;"' : ''}><input type="hidden" name="rez_id" value="${r.id}"><input type="hidden" name="actiune" value="finalizeaza"><button type="submit" class="btn-final"${mobile ? ' style="width:100%;"' : ''}>Finalizat</button></form>`;
    return h;
  };

  let lista: string;
  if (!rezervari || rezervari.length === 0) {
    lista = `<div class="card" style="text-align:center;padding:2rem;color:var(--grey);">Nicio programare găsită.</div>`;
  } else {
    const rows = rezervari.map((r) => `<tr>
        <td>${dateRo(r.data)}</td>
        <td>${timeShort(r.ora_start)}</td>
        <td><strong>${esc(r.client_nume)}</strong><br><small style="color:var(--grey)">${esc(r.client_email)}</small></td>
        <td>${esc(r.client_telefon ?? '')}</td>
        <td><strong style="font-family:'Barlow Condensed',sans-serif;letter-spacing:1px;">${esc(r.nr_inmatriculare ?? '-')}</strong><br><small style="color:var(--grey)">${esc((r.producator ?? '') + ' ' + (r.model ?? ''))}</small></td>
        <td>${serviciuLabel(r.serviciu_tip)}</td>
        <td>${r.durata}h</td>
        <td style="max-width:160px;font-size:0.85rem;color:var(--grey);">${esc(r.descriere ? String(r.descriere).slice(0, 80) : '-')}</td>
        <td><span class="badge badge-${r.status}">${STATUS_LABEL[r.status] ?? r.status}</span></td>
        <td><div class="action-btns">${actiuni(r)}<a href="/admin/deviz?rezervare_id=${r.id}" class="btn-inlucru" style="padding:0.3rem 0.8rem;font-size:0.8rem;font-family:'Barlow Condensed',sans-serif;font-weight:700;letter-spacing:1px;text-transform:uppercase;text-decoration:none;border:1px solid #1a6a9a;color:#1a6a9a;">Deviz</a></div></td>
    </tr>`).join('');

    const carduri = rezervari.map((r) => `<div class="admin-card status-${r.status}">
        <div class="admin-card-header"><div class="admin-card-masina">${esc(r.nr_inmatriculare ?? '-')}<small>${esc((r.producator ?? '') + ' ' + (r.model ?? ''))}</small></div><span class="badge badge-${r.status}">${STATUS_LABEL[r.status] ?? r.status}</span></div>
        <div class="admin-card-grid">
            <div class="admin-card-row"><span class="lbl">Data</span><span class="val">${dateRo(r.data)}</span></div>
            <div class="admin-card-row"><span class="lbl">Ora</span><span class="val">${timeShort(r.ora_start)} (${r.durata}h)</span></div>
            <div class="admin-card-row"><span class="lbl">Client</span><span class="val">${esc(r.client_nume)}<small>${esc(r.client_telefon ?? '')}</small></span></div>
            <div class="admin-card-row"><span class="lbl">Serviciu</span><span class="val">${serviciuLabel(r.serviciu_tip)}</span></div>
        </div>
        ${r.descriere ? `<div class="admin-card-descriere">${esc(String(r.descriere).slice(0, 120))}</div>` : ''}
        <div class="admin-card-actions">${actiuni(r, true)}</div>
        <div style="margin-top:0.6rem;"><a href="/admin/deviz?rezervare_id=${r.id}" style="display:block;text-align:center;padding:0.5rem;border:1px solid var(--border);color:var(--grey);font-size:0.8rem;font-family:'Barlow Condensed',sans-serif;font-weight:700;letter-spacing:1px;text-transform:uppercase;text-decoration:none;">🔧 Deviz</a></div>
    </div>`).join('');

    lista = `<div class="tabel-desktop"><div class="card" style="padding:0;overflow-x:auto;"><table>
        <thead><tr><th>Data</th><th>Ora</th><th>Client</th><th>Telefon</th><th>Mașina</th><th>Serviciu</th><th>Durată</th><th>Descriere</th><th>Status</th><th>Acțiuni</th></tr></thead>
        <tbody>${rows}</tbody></table></div></div>
    <div class="carduri-mobile">${carduri}</div>`;
  }

  const body = `<div class="container">
    <div class="page-title">Panou <span>Admin</span></div>
    <div class="page-subtitle">Gestionează programările service-ului</div>
    <div class="stats-row">
        <div class="stat-card"><div class="num" style="color:#f0a500">${stats.asteptare ?? 0}</div><div class="lbl">Așteptare</div></div>
        <div class="stat-card"><div class="num" style="color:#2ecc71">${stats.confirmat ?? 0}</div><div class="lbl">Confirmate</div></div>
        <div class="stat-card"><div class="num" style="color:#3498db">${stats.in_lucru ?? 0}</div><div class="lbl">În lucru</div></div>
        <div class="stat-card"><div class="num" style="color:var(--grey)">${stats.finalizat ?? 0}</div><div class="lbl">Finalizate</div></div>
        <div class="stat-card"><div class="num" style="color:var(--red)">${stats.respins ?? 0}</div><div class="lbl">Respinse</div></div>
    </div>
    <div class="filters">${filterLinks}
        <form method="GET" style="display:flex;gap:0.5rem;align-items:center;flex-wrap:wrap;">
            <input type="hidden" name="status" value="${esc(filterStatus)}">
            <input type="date" name="data" value="${esc(filterData)}">
            <button type="submit" class="btn btn-outline" style="padding:0.4rem 0.8rem;font-size:0.8rem;">Filtrează</button>
            ${filterData ? `<a href="/admin?status=${esc(filterStatus)}" class="btn btn-outline" style="padding:0.4rem 0.8rem;font-size:0.8rem;">Reset</a>` : ''}
        </form>
    </div>
    ${lista}
  </div>
  <div class="modal" id="modal-respinge"><div class="modal-box"><h3>Respinge programarea</h3>
    <form method="POST" id="form-respinge"><input type="hidden" name="rez_id" id="respinge-id"><input type="hidden" name="actiune" value="respinge">
        <div class="form-group"><label>Motiv (opțional)</label><input type="text" name="motiv" placeholder="ex: Nu avem disponibilitate în acea zi"></div>
        <div style="display:flex;gap:1rem;margin-top:1rem;"><button type="submit" class="btn btn-danger">Respinge</button><button type="button" class="btn btn-outline" onclick="closeRespinge()">Anulează</button></div>
    </form></div></div>`;
  const bodyEnd = `<script>
    function openRespinge(id){document.getElementById('respinge-id').value=id;document.getElementById('modal-respinge').classList.add('open');}
    function closeRespinge(){document.getElementById('modal-respinge').classList.remove('open');}
    document.getElementById('modal-respinge').addEventListener('click',function(e){if(e.target===this)closeRespinge();});
  </script>`;
  return c.html(page({ title: 'Admin — APG Garage', user, nav: 'admin', currentPath: '/admin', headExtra: INDEX_STYLE, body, bodyEnd }));
});

/* ============================ BLOCARE ============================ */
app.get('/blocare', async (c) => renderBlocare(c, '', ''));
app.post('/blocare', async (c) => {
  const form = await c.req.formData();
  let error = '';
  let success = '';
  if (form.get('adauga') !== null) {
    const data = String(form.get('data') ?? '');
    const motiv = String(form.get('motiv') ?? '').trim();
    if (!data) error = 'Alege o dată.';
    else {
      try {
        await c.env.DB.prepare('INSERT INTO zile_blocate (data, motiv) VALUES (?, ?)').bind(data, motiv).run();
        success = 'Ziua a fost blocată.';
      } catch {
        error = 'Această dată este deja blocată.';
      }
    }
  } else if (form.get('sterge') !== null) {
    const id = parseInt(String(form.get('zi_id') ?? '0'), 10);
    await c.env.DB.prepare('DELETE FROM zile_blocate WHERE id = ?').bind(id).run();
    success = 'Ziua a fost deblocată.';
  }
  return renderBlocare(c, error, success);
});

async function renderBlocare(c: AppContext, error: string, success: string) {
  const user = c.get('user')!;
  const { results: zile } = await c.env.DB.prepare('SELECT * FROM zile_blocate ORDER BY data ASC').all<any>();
  const zileRo = ['', 'Luni', 'Marți', 'Miercuri', 'Joi', 'Vineri', 'Sâmbătă', 'Duminică'];
  const today = new Date().toISOString().slice(0, 10);

  let lista: string;
  if (!zile || zile.length === 0) {
    lista = `<div class="card" style="text-align:center;color:var(--grey);padding:2rem;">Nicio zi blocată momentan.</div>`;
  } else {
    const rows = zile.map((z) => {
      const dow = new Date(String(z.data) + 'T00:00:00Z').getUTCDay();
      const iso = dow === 0 ? 7 : dow;
      return `<tr><td>${dateRo(z.data)}</td><td>${zileRo[iso]}</td><td style="color:var(--grey)">${esc(z.motiv || '-')}</td>
        <td><form method="POST" onsubmit="return confirm('Deblochezi această zi?')"><input type="hidden" name="zi_id" value="${z.id}"><button type="submit" name="sterge" value="1" class="btn btn-danger" style="padding:0.3rem 0.8rem;font-size:0.8rem;">Deblochează</button></form></td></tr>`;
    }).join('');
    lista = `<div class="card" style="padding:0;"><table><thead><tr><th>Data</th><th>Zi</th><th>Motiv</th><th></th></tr></thead><tbody>${rows}</tbody></table></div>`;
  }

  const body = `<div class="container" style="max-width:700px;">
    <div class="page-title">Zile <span>blocate</span></div>
    <div class="page-subtitle">Marchează zilele în care service-ul nu primește programări</div>
    ${error ? `<div class="alert alert-error">${esc(error)}</div>` : ''}
    ${success ? `<div class="alert alert-success">${esc(success)}</div>` : ''}
    <div class="card"><form method="POST" style="display:flex;gap:1rem;flex-wrap:wrap;align-items:flex-end;">
        <div class="form-group" style="margin:0;flex:1;min-width:160px;"><label>Dată</label><input type="date" name="data" min="${today}" required></div>
        <div class="form-group" style="margin:0;flex:2;min-width:200px;"><label>Motiv (opțional)</label><input type="text" name="motiv" placeholder="ex: Zi liberă, Concediu"></div>
        <button type="submit" name="adauga" value="1" class="btn btn-primary" style="margin-bottom:0;">Blochează ziua</button>
    </form></div>
    ${lista}
  </div>`;
  return c.html(page({ title: 'Zile blocate — APG Garage', user, nav: 'admin', currentPath: '/admin/blocare', body }));
}

/* ============================ PROGRAMUL ZILEI ============================ */
const ZI_STYLE = `<style>
    .zi-nav { display:flex; align-items:center; justify-content:space-between; gap:1rem; margin-bottom:1.5rem; flex-wrap:wrap; }
    .zi-nav .zi-when { font-family:'Barlow Condensed',sans-serif; font-size:1.3rem; font-weight:700; text-transform:uppercase; letter-spacing:1px; }
    .zi-nav a, .zi-nav button { border:1px solid var(--border); color:var(--grey); background:none; text-decoration:none; padding:0.4rem 0.8rem; font-size:0.85rem; cursor:pointer; transition:all 0.15s; }
    .zi-nav a:hover { border-color:var(--red); color:var(--red); }
    .zi-nav input[type=date] { background:var(--black); border:1px solid var(--border); color:var(--white); padding:0.4rem 0.6rem; font-family:'Barlow',sans-serif; }
    .slot-block { margin-bottom:1.2rem; }
    .slot-time { font-family:'Barlow Condensed',sans-serif; font-size:1.1rem; font-weight:700; letter-spacing:1px; padding:0.5rem 1rem; background:var(--black); border-left:4px solid var(--red); display:flex; justify-content:space-between; align-items:center; }
    .slot-cap { font-size:0.72rem; color:var(--grey); letter-spacing:1px; }
    .zi-card { background:var(--dark2); border:1px solid var(--border); border-top:none; border-left:4px solid var(--border); padding:0.9rem 1.2rem; display:flex; justify-content:space-between; gap:1rem; flex-wrap:wrap; align-items:center; }
    .zi-card.status-asteptare { border-left-color:#f0a500; } .zi-card.status-confirmat { border-left-color:#2ecc71; } .zi-card.status-in_lucru { border-left-color:#3498db; } .zi-card.status-finalizat { border-left-color:var(--grey); }
    .zi-card .zc-main { font-family:'Barlow Condensed',sans-serif; font-weight:700; letter-spacing:1px; }
    .zi-card .zc-main small { display:block; font-family:'Barlow',sans-serif; font-weight:400; letter-spacing:0; color:var(--grey); font-size:0.82rem; }
    .zi-card .zc-meta { color:var(--grey-light); font-size:0.85rem; }
    .adauga-form { background:var(--dark2); border:1px solid var(--border); border-top:4px solid var(--red); padding:1.5rem; margin-bottom:2rem; }
    .adauga-form h3 { font-family:'Barlow Condensed',sans-serif; font-size:1.15rem; font-weight:700; text-transform:uppercase; letter-spacing:1px; margin-bottom:1rem; }
    .fg3 { display:grid; grid-template-columns:1fr 1fr 1fr; gap:0 1rem; } .fg2m { display:grid; grid-template-columns:1fr 1fr; gap:0 1rem; }
    @media(max-width:650px){ .fg3,.fg2m { grid-template-columns:1fr; } }
</style>`;

const ALL_SLOTS = ['09:00', '11:00', '13:00', '15:00'];

app.post('/zi', async (c) => {
  const form = await c.req.formData();
  const data = String(form.get('data') ?? todayRo());
  if (String(form.get('actiune') ?? '') === 'adauga_manual') {
    const clientId = String(form.get('client_id') ?? '');
    const numeNou = String(form.get('client_nou_nume') ?? '').trim();
    const telNou = String(form.get('client_nou_telefon') ?? '').trim();
    const emailNou = String(form.get('client_nou_email') ?? '').trim();
    const nr = String(form.get('nr_inmatriculare') ?? '').trim().toUpperCase();
    const prod = String(form.get('producator') ?? '').trim();
    const model = String(form.get('model') ?? '').trim();
    const serviciu = String(form.get('serviciu_tip') ?? '').trim();
    const ora = String(form.get('ora_start') ?? '');
    const durata = parseInt(String(form.get('durata') ?? '2'), 10);
    const descriere = String(form.get('descriere') ?? '').trim();

    let error = '';
    let userId = parseInt(clientId, 10);
    if (!clientId && numeNou) {
      // client nou (walk-in / telefon) — cont minimal
      const email = emailNou || `walkin.${Date.now()}@apg-garage.ro`;
      const exist = await c.env.DB.prepare('SELECT id FROM users WHERE email = ?').bind(email).first<{ id: number }>();
      if (exist) userId = exist.id;
      else {
        const hash = await hashPassword(Math.random().toString(36).slice(2) + Date.now());
        const res = await c.env.DB.prepare('INSERT INTO users (nume, email, parola, telefon) VALUES (?, ?, ?, ?)').bind(numeNou, email, hash, telNou).run();
        userId = Number(res.meta.last_row_id);
      }
    }
    if (!userId || isNaN(userId)) error = 'Alege un client existent sau completează numele clientului nou.';
    else if (!serviciu || !ora) error = 'Alege serviciul și ora.';
    else if (!nr || !prod || !model) error = 'Completează datele mașinii.';
    else {
      await c.env.DB.prepare('INSERT INTO rezervari (user_id, nr_inmatriculare, producator, model, serviciu_tip, descriere, data, ora_start, durata, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
        .bind(userId, nr, prod, model, serviciu, descriere, data, ora + ':00', durata, 'confirmat').run();
    }
    if (error) return renderZi(c, data, error, '');
    return c.redirect('/admin/zi?data=' + data);
  }
  return renderZi(c, data, '', '');
});

app.get('/zi', async (c) => {
  const data = c.req.query('data') || todayRo();
  return renderZi(c, data, '', '');
});

async function renderZi(c: AppContext, data: string, error: string, success: string) {
  const user = c.get('user')!;
  const valid = /^\d{4}-\d{2}-\d{2}$/.test(data) ? data : todayRo();

  const capacitate = Math.max(1, parseInt((await c.env.DB.prepare(`SELECT valoare FROM setari WHERE cheie='capacitate_simultan'`).first<{ valoare: string }>())?.valoare || '1', 10) || 1);

  const { results: rez } = await c.env.DB.prepare(
    `SELECT r.*, u.nume as client_nume, u.telefon as client_telefon
     FROM rezervari r JOIN users u ON u.id = r.user_id
     WHERE r.data = ? AND r.status IN ('asteptare','confirmat','in_lucru','finalizat')
     ORDER BY r.ora_start ASC`,
  ).bind(valid).all<any>();

  const { results: clienti } = await c.env.DB.prepare(`SELECT id, nume, telefon FROM users WHERE rol='client' ORDER BY nume`).all<any>();
  const { results: servicii } = await c.env.DB.prepare('SELECT nume FROM servicii WHERE activ = 1 ORDER BY ordine ASC, id ASC').all<{ nume: string }>();
  const servOpts = (servicii && servicii.length)
    ? servicii.map((s) => `<option value="${esc(s.nume)}">${esc(s.nume)}</option>`).join('')
    : `<option value="revizie">Revizie</option><option value="reparatie">Reparație mecanică</option><option value="verificare_rampa">Verificare rampă</option>`;
  const clientOpts = (clienti ?? []).map((u) => `<option value="${u.id}">${esc(u.nume)}${u.telefon ? ' — ' + esc(u.telefon) : ''}</option>`).join('');

  const byOra = new Map<string, any[]>();
  for (const r of rez ?? []) {
    const o = timeShort(r.ora_start);
    if (!byOra.has(o)) byOra.set(o, []);
    byOra.get(o)!.push(r);
  }

  const zileRo = ['Duminică', 'Luni', 'Marți', 'Miercuri', 'Joi', 'Vineri', 'Sâmbătă'];
  const dow = new Date(valid + 'T00:00:00Z').getUTCDay();
  const total = (rez ?? []).length;

  const blocuri = ALL_SLOTS.map((slot) => {
    const list = byOra.get(slot) ?? [];
    const carduri = list.map((r) => `<div class="zi-card status-${r.status}">
        <div class="zc-main">${esc(r.nr_inmatriculare ?? '-')}<small>${esc((r.producator ?? '') + ' ' + (r.model ?? ''))}</small></div>
        <div class="zc-meta">${esc(r.client_nume)}${r.client_telefon ? ' · <a href="tel:' + esc(r.client_telefon) + '" style="color:var(--grey-light);text-decoration:none;">' + esc(r.client_telefon) + '</a>' : ''}</div>
        <div class="zc-meta">${serviciuLabel(r.serviciu_tip)} · ${r.durata}h</div>
        <span class="badge badge-${r.status}">${STATUS_LABEL[r.status] ?? r.status}</span>
        <a href="/admin/deviz?rezervare_id=${r.id}" style="color:var(--red);font-size:0.8rem;text-decoration:none;">Deviz →</a>
    </div>`).join('');
    return `<div class="slot-block">
      <div class="slot-time"><span>${slot}</span><span class="slot-cap">${list.length}/${capacitate} ocupate</span></div>
      ${list.length ? carduri : '<div class="zi-card" style="color:var(--grey);justify-content:center;">— liber —</div>'}
    </div>`;
  }).join('');

  const body = `<div class="container">
    <div class="page-title">Programul <span>zilei</span></div>
    <div class="page-subtitle">${total} programări active în această zi · capacitate ${capacitate}/interval</div>
    ${success ? `<div class="alert alert-success">${esc(success)}</div>` : ''}
    ${error ? `<div class="alert alert-error">${esc(error)}</div>` : ''}

    <div class="zi-nav">
      <a href="/admin/zi?data=${addDays(valid, -1)}">← Ziua precedentă</a>
      <div class="zi-when">${zileRo[dow]}, ${dateRo(valid)}</div>
      <form method="GET" style="display:flex;gap:0.5rem;align-items:center;"><input type="date" name="data" value="${valid}"><button type="submit">Mergi</button></form>
      <a href="/admin/zi?data=${addDays(valid, 1)}">Ziua următoare →</a>
    </div>

    <div class="adauga-form"><h3>+ Programare manuală (telefon / la fața locului)</h3>
      <form method="POST">
        <input type="hidden" name="actiune" value="adauga_manual"><input type="hidden" name="data" value="${valid}">
        <div class="fg2m">
          <div class="form-group"><label>Client existent</label><select name="client_id"><option value="">— sau client nou mai jos —</option>${clientOpts}</select></div>
          <div class="form-group"><label>Serviciu *</label><select name="serviciu_tip">${servOpts}</select></div>
        </div>
        <div class="fg3">
          <div class="form-group"><label>Client nou — nume</label><input type="text" name="client_nou_nume" placeholder="ex: Ion Popescu"></div>
          <div class="form-group"><label>Telefon</label><input type="tel" name="client_nou_telefon" placeholder="07xx..."></div>
          <div class="form-group"><label>Email (opțional)</label><input type="email" name="client_nou_email" placeholder="opțional"></div>
        </div>
        <div class="fg3">
          <div class="form-group"><label>Nr. înmatriculare *</label><input type="text" name="nr_inmatriculare" style="text-transform:uppercase;" placeholder="B 123 ABC"></div>
          <div class="form-group"><label>Producător *</label><input type="text" name="producator" placeholder="VW"></div>
          <div class="form-group"><label>Model *</label><input type="text" name="model" placeholder="Golf"></div>
        </div>
        <div class="fg3">
          <div class="form-group"><label>Ora *</label><select name="ora_start"><option value="09:00">09:00</option><option value="11:00">11:00</option><option value="13:00">13:00</option><option value="15:00">15:00</option></select></div>
          <div class="form-group"><label>Durată</label><select name="durata"><option value="2">2 ore</option><option value="4">4 ore</option></select></div>
          <div class="form-group" style="display:flex;align-items:flex-end;"><button type="submit" class="btn btn-primary" style="width:100%;">Adaugă în program</button></div>
        </div>
        <div class="form-group" style="margin-bottom:0;"><label>Descriere (opțional)</label><input type="text" name="descriere" placeholder="Detalii lucrare..."></div>
      </form>
    </div>

    ${blocuri}
  </div>`;
  return c.html(page({ title: 'Programul zilei — Admin APG Garage', user, nav: 'admin', currentPath: '/admin/zi', headExtra: ZI_STYLE, body }));
}

export default app;
