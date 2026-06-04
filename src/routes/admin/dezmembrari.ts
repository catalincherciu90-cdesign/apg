import { Hono } from 'hono';
import type { Env, Variables, AppContext } from '../../types';
import { page } from '../../views/layout';
import { esc, nl2br } from '../../lib/format';
import { trimiteEmail, emailTemplate } from '../../lib/mailer';

const app = new Hono<{ Bindings: Env; Variables: Variables }>();
const jsAttr = (s: string) => esc(s).replace(/'/g, '&#039;');

function dtRo(s: string): string {
  const d = new Date(String(s).replace(' ', 'T') + 'Z');
  if (isNaN(d.getTime())) return esc(s);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(d.getUTCDate())}.${p(d.getUTCMonth() + 1)}.${d.getUTCFullYear()} ${p(d.getUTCHours())}:${p(d.getUTCMinutes())}`;
}

/* ============================ MASINI DEZMEMBRATE ============================ */
const DEZM_STYLE = `<style>
    .adauga-form { background:var(--dark2); border:1px solid var(--border); border-top:4px solid var(--red); padding:1.8rem; margin-bottom:2rem; }
    .adauga-form h3 { font-family:'Barlow Condensed',sans-serif; font-size:1.2rem; font-weight:700; text-transform:uppercase; letter-spacing:1px; margin-bottom:1.2rem; }
    .fg4 { display:grid; grid-template-columns:1fr 1fr 1fr 1fr; gap:0 1rem; } .fg2 { display:grid; grid-template-columns:1fr 1fr; gap:0 1rem; }
    @media(max-width:800px){ .fg4 { grid-template-columns:1fr 1fr; } } @media(max-width:500px){ .fg4,.fg2 { grid-template-columns:1fr; } }
    .masina-card { background:var(--dark2); border:1px solid var(--border); border-left:4px solid; padding:1.2rem 1.5rem; margin-bottom:0.8rem; }
    .masina-card.activa { border-left-color:#2ecc71; } .masina-card.inactiva { border-left-color:#444; opacity:0.65; }
    .mc-header { display:flex; justify-content:space-between; align-items:flex-start; gap:1rem; margin-bottom:0.5rem; flex-wrap:wrap; }
    .mc-titlu { font-family:'Barlow Condensed',sans-serif; font-size:1.2rem; font-weight:700; text-transform:uppercase; letter-spacing:1px; }
    .mc-meta { color:var(--grey); font-size:0.85rem; margin-bottom:0.6rem; }
    .mc-descr { font-size:0.85rem; color:var(--grey-light); margin-bottom:0.8rem; }
    .mc-actions { display:flex; gap:0.5rem; flex-wrap:wrap; }
    .mc-actions button { padding:0.35rem 0.8rem; font-family:'Barlow Condensed',sans-serif; font-size:0.8rem; font-weight:700; letter-spacing:1px; text-transform:uppercase; cursor:pointer; border:1px solid; background:none; transition:all 0.15s; }
    .btn-edit-m { border-color:var(--border); color:var(--grey); } .btn-edit-m:hover { border-color:var(--white); color:var(--white); }
    .btn-toggle-m { border-color:#1e8449; color:#2ecc71; } .btn-toggle-m:hover { background:#1e8449; color:#fff; }
    .btn-toggle-m.off { border-color:#444; color:#666; } .btn-toggle-m.off:hover { background:#444; color:#fff; }
    .btn-del-m { border-color:#333; color:#555; } .btn-del-m:hover { border-color:var(--red); color:var(--red); }
    .cereri-badge { font-size:0.75rem; background:#0b1e2c; color:#3498db; border:1px solid #1a6a9a; padding:0.2rem 0.6rem; text-decoration:none; }
    .modal { display:none; position:fixed; inset:0; background:rgba(0,0,0,0.85); z-index:999; align-items:center; justify-content:center; padding:1rem; }
    .modal.open { display:flex; }
    .modal-box { background:var(--dark2); border:1px solid var(--border); padding:1.8rem; width:100%; max-width:500px; }
    .modal-box h3 { font-family:'Barlow Condensed',sans-serif; font-size:1.3rem; font-weight:800; text-transform:uppercase; margin-bottom:1.2rem; }
</style>`;

app.post('/dezmembrari', async (c) => {
  const form = await c.req.formData();
  const actiune = String(form.get('actiune') ?? '');
  let error = '';
  let success = '';
  if (actiune === 'toggle') {
    await c.env.DB.prepare('UPDATE dezmembrari SET activ = 1 - activ WHERE id=?').bind(parseInt(String(form.get('masina_id') ?? '0'), 10)).run();
    return c.redirect('/admin/dezmembrari');
  }
  const prod = String(form.get('producator') ?? '').trim();
  const model = String(form.get('model') ?? '').trim();
  const an = String(form.get('an_fabricatie') ?? '').trim();
  const motor = String(form.get('motorizare') ?? '').trim();
  const descr = String(form.get('descriere') ?? '').trim();
  if (actiune === 'adauga') {
    if (!prod || !model) error = 'Producătorul și modelul sunt obligatorii.';
    else {
      await c.env.DB.prepare('INSERT INTO dezmembrari (producator, model, an_fabricatie, motorizare, descriere) VALUES (?, ?, ?, ?, ?)').bind(prod, model, an, motor, descr).run();
      success = 'Mașina a fost adăugată.';
    }
  } else if (actiune === 'editeaza') {
    const id = parseInt(String(form.get('masina_id') ?? '0'), 10);
    if (!prod || !model) error = 'Producătorul și modelul sunt obligatorii.';
    else {
      await c.env.DB.prepare('UPDATE dezmembrari SET producator=?, model=?, an_fabricatie=?, motorizare=?, descriere=? WHERE id=?').bind(prod, model, an, motor, descr, id).run();
      success = 'Mașina a fost actualizată.';
    }
  } else if (actiune === 'sterge') {
    await c.env.DB.prepare('DELETE FROM dezmembrari WHERE id=?').bind(parseInt(String(form.get('masina_id') ?? '0'), 10)).run();
    success = 'Mașina a fost ștearsă.';
  }
  return renderDezm(c, error, success);
});

app.get('/dezmembrari', async (c) => renderDezm(c, '', ''));

async function renderDezm(c: AppContext, error: string, success: string) {
  const user = c.get('user')!;
  const { results: masini } = await c.env.DB.prepare('SELECT *, (SELECT COUNT(*) FROM cereri_piese WHERE dezmembrare_id = dezmembrari.id) as nr_cereri FROM dezmembrari ORDER BY activ DESC, producator, model').all<any>();

  const carduri = (masini ?? []).map((m) => `<div class="masina-card ${m.activ ? 'activa' : 'inactiva'}">
    <div class="mc-header"><div>
        <div class="mc-titlu">${esc(m.producator)} ${esc(m.model)}</div>
        <div class="mc-meta">${esc(m.an_fabricatie || '—')}${m.motorizare ? ' · ' + esc(m.motorizare) : ''} · ${m.activ ? '<span style="color:#2ecc71;">Vizibilă</span>' : '<span style="color:#666;">Ascunsă</span>'}</div>
    </div>${m.nr_cereri > 0 ? `<a href="/admin/cereri-piese" class="cereri-badge">${m.nr_cereri} cereri</a>` : ''}</div>
    ${m.descriere ? `<div class="mc-descr">${esc(m.descriere)}</div>` : ''}
    <div class="mc-actions">
        <button class="btn-edit-m" onclick="openEdit(${m.id},'${jsAttr(m.producator)}','${jsAttr(m.model)}','${jsAttr(m.an_fabricatie ?? '')}','${jsAttr(m.motorizare ?? '')}','${jsAttr(m.descriere ?? '')}')">Editează</button>
        <form method="POST" style="display:inline;"><input type="hidden" name="actiune" value="toggle"><input type="hidden" name="masina_id" value="${m.id}"><button type="submit" class="btn-toggle-m ${m.activ ? '' : 'off'}">${m.activ ? 'Ascunde' : 'Afișează'}</button></form>
        <form method="POST" style="display:inline;" onsubmit="return confirm('Ștergi această mașină?')"><input type="hidden" name="actiune" value="sterge"><input type="hidden" name="masina_id" value="${m.id}"><button type="submit" class="btn-del-m">Șterge</button></form>
    </div>
  </div>`).join('');

  const body = `<div class="container">
    <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:1rem;margin-bottom:0.3rem;">
        <div class="page-title">Mașini <span>dezmembrate</span></div>
        <a href="/admin/cereri-piese" class="btn btn-outline" style="padding:0.5rem 1.2rem;font-size:0.88rem;">Cereri piese →</a>
    </div>
    <div class="page-subtitle">Adaugă și gestionează mașinile disponibile pe site pentru dezmembrare.</div>
    ${success ? `<div class="alert alert-success">${esc(success)}</div>` : ''}
    ${error ? `<div class="alert alert-error">${esc(error)}</div>` : ''}
    <div class="adauga-form"><h3>+ Mașină nouă la dezmembrat</h3>
        <form method="POST"><input type="hidden" name="actiune" value="adauga">
            <div class="fg4">
                <div class="form-group"><label>Producător *</label><input type="text" name="producator" placeholder="ex: Volkswagen" required></div>
                <div class="form-group"><label>Model *</label><input type="text" name="model" placeholder="ex: Golf 5" required></div>
                <div class="form-group"><label>An fabricație</label><input type="text" name="an_fabricatie" placeholder="ex: 2008"></div>
                <div class="form-group"><label>Motorizare</label><input type="text" name="motorizare" placeholder="ex: 1.9 TDI 105cp"></div>
            </div>
            <div class="form-group" style="margin-bottom:1rem;"><label>Descriere / stare</label><input type="text" name="descriere" placeholder="ex: Caroserie intactă, motor funcțional"></div>
            <button type="submit" class="btn btn-primary">Adaugă mașina</button>
        </form>
    </div>
    ${(masini ?? []).length === 0 ? `<div class="card" style="text-align:center;color:var(--grey);padding:2rem;">Nicio mașină adăugată încă.</div>` : `<div style="color:var(--grey);font-size:0.82rem;margin-bottom:1rem;">${masini!.length} mașini înregistrate</div>${carduri}`}
  </div>
  <div class="modal" id="modal-edit"><div class="modal-box"><h3>Editează <span style="color:var(--red)">mașina</span></h3>
    <form method="POST"><input type="hidden" name="actiune" value="editeaza"><input type="hidden" name="masina_id" id="edit-id">
        <div class="fg2">
            <div class="form-group"><label>Producător *</label><input type="text" name="producator" id="edit-prod" required></div>
            <div class="form-group"><label>Model *</label><input type="text" name="model" id="edit-model" required></div>
            <div class="form-group"><label>An fabricație</label><input type="text" name="an_fabricatie" id="edit-an"></div>
            <div class="form-group"><label>Motorizare</label><input type="text" name="motorizare" id="edit-motor"></div>
        </div>
        <div class="form-group"><label>Descriere</label><input type="text" name="descriere" id="edit-descr"></div>
        <div style="display:flex;gap:1rem;margin-top:0.5rem;"><button type="submit" class="btn btn-primary">Salvează</button><button type="button" class="btn btn-outline" onclick="closeEdit()">Anulează</button></div>
    </form></div></div>`;
  const bodyEnd = `<script>
    function openEdit(id,prod,model,an,motor,descr){document.getElementById('edit-id').value=id;document.getElementById('edit-prod').value=prod;document.getElementById('edit-model').value=model;document.getElementById('edit-an').value=an;document.getElementById('edit-motor').value=motor;document.getElementById('edit-descr').value=descr;document.getElementById('modal-edit').classList.add('open');}
    function closeEdit(){document.getElementById('modal-edit').classList.remove('open');}
    document.getElementById('modal-edit').addEventListener('click',function(e){if(e.target===this)closeEdit();});
  </script>`;
  return c.html(page({ title: 'Mașini dezmembrate — Admin APG Garage', user, nav: 'admin', currentPath: '/admin/dezmembrari', headExtra: DEZM_STYLE, body, bodyEnd }));
}

/* ============================ CERERI PIESE ============================ */
const CERERI_STYLE = `<style>
    .stats-row { display:grid; grid-template-columns:repeat(3,1fr); gap:1rem; margin-bottom:2rem; }
    .stat-card { background:var(--dark2); border:1px solid var(--border); padding:1rem; text-align:center; }
    .stat-card .num { font-family:'Barlow Condensed',sans-serif; font-size:2rem; font-weight:800; line-height:1; }
    .stat-card .lbl { font-size:0.7rem; color:var(--grey); letter-spacing:1px; text-transform:uppercase; margin-top:0.3rem; }
    .filters { display:flex; gap:0.5rem; flex-wrap:wrap; margin-bottom:1.5rem; }
    .filters a { padding:0.4rem 0.9rem; border:1px solid var(--border); color:var(--grey); text-decoration:none; font-size:0.8rem; font-weight:600; letter-spacing:1px; text-transform:uppercase; transition:all 0.15s; }
    .filters a:hover, .filters a.active { border-color:var(--red); color:var(--red); }
    .cerere-card { background:var(--dark2); border:1px solid var(--border); border-left:4px solid; padding:1.2rem 1.5rem; margin-bottom:1rem; }
    .cerere-card.asteptare { border-left-color:#f0a500; } .cerere-card.disponibil { border-left-color:#2ecc71; } .cerere-card.indisponibil { border-left-color:var(--red); }
    .cerere-header { display:flex; justify-content:space-between; align-items:flex-start; gap:1rem; margin-bottom:0.8rem; flex-wrap:wrap; }
    .cerere-client { font-family:'Barlow Condensed',sans-serif; font-size:1.1rem; font-weight:700; letter-spacing:1px; }
    .cerere-data { color:var(--grey); font-size:0.82rem; }
    .cerere-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(200px,1fr)); gap:0.5rem 1rem; margin-bottom:0.8rem; font-size:0.88rem; }
    .cerere-row .lbl { font-size:0.68rem; font-weight:700; letter-spacing:1.5px; text-transform:uppercase; color:var(--grey); }
    .cerere-row .val { color:var(--white); }
    .piesa-box { background:var(--black); border:1px solid var(--border); border-left:3px solid var(--red); padding:0.7rem 1rem; margin-bottom:0.8rem; font-size:0.88rem; color:var(--grey-light); }
    .piesa-box strong { display:block; font-size:0.68rem; letter-spacing:1.5px; text-transform:uppercase; color:var(--grey); margin-bottom:0.2rem; }
    .raspuns-box { background:#0b2c13; border:1px solid #1e8449; padding:0.7rem 1rem; margin-bottom:0.8rem; font-size:0.85rem; color:#a9dfbf; }
    .raspuns-box.neg { background:#2c0b0b; border-color:var(--red); color:#f5b7b1; }
    .raspuns-box strong { display:block; font-size:0.68rem; letter-spacing:1.5px; text-transform:uppercase; margin-bottom:0.2rem; }
    .modal { display:none; position:fixed; inset:0; background:rgba(0,0,0,0.85); z-index:999; align-items:center; justify-content:center; padding:1rem; }
    .modal.open { display:flex; }
    .modal-box { background:var(--dark2); border:1px solid var(--border); padding:1.8rem; width:100%; max-width:500px; }
    .modal-box h3 { font-family:'Barlow Condensed',sans-serif; font-size:1.3rem; font-weight:800; text-transform:uppercase; margin-bottom:1rem; }
</style>`;

app.post('/cereri-piese', async (c) => {
  const form = await c.req.formData();
  let error = '';
  let success = '';
  if (String(form.get('actiune') ?? '') === 'raspunde') {
    const id = parseInt(String(form.get('cerere_id') ?? '0'), 10);
    const status = String(form.get('status_cerere') ?? 'asteptare');
    const raspuns = String(form.get('raspuns_admin') ?? '').trim();
    if (!raspuns) error = 'Scrie un mesaj pentru client înainte să trimiți răspunsul.';
    else {
      await c.env.DB.prepare('UPDATE cereri_piese SET status=?, raspuns_admin=? WHERE id=?').bind(status, raspuns, id).run();
      const cerere = await c.env.DB.prepare(`SELECT cp.*, d.producator, d.model, d.an_fabricatie, u.email FROM cereri_piese cp LEFT JOIN dezmembrari d ON d.id = cp.dezmembrare_id LEFT JOIN users u ON u.id = cp.user_id WHERE cp.id = ?`).bind(id).first<any>();
      if (cerere && cerere.email) {
        const statusText = status === 'disponibil' ? 'DISPONIBILĂ' : 'INDISPONIBILĂ';
        const culoare = status === 'disponibil' ? '#2ecc71' : '#c0392b';
        const continut = `<p>Ai primit un răspuns la cererea ta de piesă.</p><table class="info-table">
            <tr><td>Mașina</td><td>${esc((cerere.producator ?? '') + ' ' + (cerere.model ?? '') + ' ' + (cerere.an_fabricatie ?? ''))}</td></tr>
            <tr><td>Piesa cerută</td><td>${esc(cerere.piesa_dorita)}</td></tr>
            <tr><td>Disponibilitate</td><td><strong style="color:${culoare};">${statusText}</strong></td></tr>
          </table><p style="margin-top:1rem;"><strong>Mesaj de la service:</strong><br>${nl2br(raspuns)}</p>
          <a href="${c.env.BASE_URL}/dezmembrari" class="btn">Vezi alte piese disponibile</a>`;
        c.executionCtx.waitUntil(trimiteEmail(c.env, cerere.email, 'Răspuns cerere piesă — APG Garage', emailTemplate('Răspuns la cererea ta de piesă', continut)));
      }
      success = 'Răspunsul a fost trimis clientului.';
    }
  }
  return renderCereri(c, error, success);
});

app.get('/cereri-piese', async (c) => renderCereri(c, '', ''));

async function renderCereri(c: AppContext, error: string, success: string) {
  const user = c.get('user')!;
  const filter = c.req.query('status') ?? 'toate';
  const baseSql = `SELECT cp.*, d.producator, d.model, d.an_fabricatie, u.email FROM cereri_piese cp LEFT JOIN dezmembrari d ON d.id = cp.dezmembrare_id LEFT JOIN users u ON u.id = cp.user_id`;
  const sql = filter !== 'toate' ? `${baseSql} WHERE cp.status = ? ORDER BY cp.created_at DESC` : `${baseSql} ORDER BY cp.created_at DESC`;
  const stmt = filter !== 'toate' ? c.env.DB.prepare(sql).bind(filter) : c.env.DB.prepare(sql);
  const { results: cereri } = await stmt.all();

  const { results: statRows } = await c.env.DB.prepare('SELECT status, COUNT(*) as cnt FROM cereri_piese GROUP BY status').all<{ status: string; cnt: number }>();
  const stats: Record<string, number> = {};
  for (const r of statRows ?? []) stats[r.status] = r.cnt;

  const filterLinks = Object.entries({ toate: 'Toate', asteptare: 'În așteptare', disponibil: 'Disponibile', indisponibil: 'Indisponibile' })
    .map(([k, v]) => `<a href="?status=${k}" class="${filter === k ? 'active' : ''}">${v}</a>`).join('');

  let lista: string;
  if (!cereri || cereri.length === 0) {
    lista = `<div class="card" style="text-align:center;color:var(--grey);padding:2rem;">Nicio cerere găsită.</div>`;
  } else {
    lista = cereri.map((cc: any) => {
      const badge = cc.status === 'asteptare' ? 'badge-asteptare' : cc.status === 'disponibil' ? 'badge-confirmat' : 'badge-respins';
      const badgeText = cc.status === 'asteptare' ? 'În așteptare' : cc.status === 'disponibil' ? 'Disponibil' : 'Indisponibil';
      return `<div class="cerere-card ${cc.status}">
        <div class="cerere-header"><div><div class="cerere-client">${esc(cc.nume)}</div><div class="cerere-data">${dtRo(cc.created_at)}</div></div><span class="badge ${badge}">${badgeText}</span></div>
        <div class="cerere-grid">
            <div class="cerere-row"><div class="lbl">Telefon</div><div class="val"><a href="tel:${esc(cc.telefon)}" style="color:var(--white);text-decoration:none;">${esc(cc.telefon)}</a></div></div>
            <div class="cerere-row"><div class="lbl">Email</div><div class="val" style="font-size:0.82rem;">${esc(cc.email ?? '—')}</div></div>
            <div class="cerere-row"><div class="lbl">Mașina dezmembrată</div><div class="val">${esc((cc.producator ?? '—') + ' ' + (cc.model ?? '') + ' ' + (cc.an_fabricatie ?? ''))}</div></div>
        </div>
        <div class="piesa-box"><strong>Piesa dorită</strong>${esc(cc.piesa_dorita)}</div>
        ${cc.raspuns_admin ? `<div class="raspuns-box ${cc.status === 'indisponibil' ? 'neg' : ''}"><strong>Răspunsul tău</strong>${nl2br(cc.raspuns_admin)}</div>` : ''}
        <button class="btn btn-outline" style="padding:0.4rem 1rem;font-size:0.82rem;" onclick="openRaspuns(${cc.id}, '${jsAttr(cc.raspuns_admin ?? '')}', '${cc.status}')">${cc.status === 'asteptare' ? 'Răspunde' : 'Modifică răspunsul'}</button>
      </div>`;
    }).join('');
  }

  const body = `<div class="container">
    <div class="page-title">Cereri <span>piese</span></div>
    <div class="page-subtitle">Răspunde la cererile clienților pentru piese din dezmembrări.</div>
    ${success ? `<div class="alert alert-success">${esc(success)}</div>` : ''}
    ${error ? `<div class="alert alert-error">${esc(error)}</div>` : ''}
    <div class="stats-row">
        <div class="stat-card"><div class="num" style="color:#f0a500">${stats.asteptare ?? 0}</div><div class="lbl">În așteptare</div></div>
        <div class="stat-card"><div class="num" style="color:#2ecc71">${stats.disponibil ?? 0}</div><div class="lbl">Disponibile</div></div>
        <div class="stat-card"><div class="num" style="color:var(--red)">${stats.indisponibil ?? 0}</div><div class="lbl">Indisponibile</div></div>
    </div>
    <div class="filters">${filterLinks}</div>
    ${lista}
  </div>
  <div class="modal" id="modal-raspuns"><div class="modal-box"><h3>Răspunde la <span style="color:var(--red)">cerere</span></h3>
    <form method="POST"><input type="hidden" name="actiune" value="raspunde"><input type="hidden" name="cerere_id" id="raspuns-id">
        <div class="form-group"><label>Disponibilitate *</label><select name="status_cerere" id="raspuns-status"><option value="disponibil">✓ Piesa este disponibilă</option><option value="indisponibil">✕ Piesa nu este disponibilă</option></select></div>
        <div class="form-group"><label>Mesaj pentru client *</label><textarea name="raspuns_admin" id="raspuns-text" rows="5" placeholder="ex: Piesa este disponibilă, prețul este 200 lei. Sună-ne la 0700 000 000 pentru a stabili ridicarea."></textarea></div>
        <div style="display:flex;gap:1rem;margin-top:0.5rem;"><button type="submit" class="btn btn-primary">Trimite răspunsul</button><button type="button" class="btn btn-outline" onclick="closeModal()">Anulează</button></div>
    </form></div></div>`;
  const bodyEnd = `<script>
    function openRaspuns(id,raspuns,status){document.getElementById('raspuns-id').value=id;document.getElementById('raspuns-text').value=raspuns;document.getElementById('raspuns-status').value=status!=='asteptare'?status:'disponibil';document.getElementById('modal-raspuns').classList.add('open');}
    function closeModal(){document.getElementById('modal-raspuns').classList.remove('open');}
    document.getElementById('modal-raspuns').addEventListener('click',function(e){if(e.target===this)closeModal();});
  </script>`;
  return c.html(page({ title: 'Cereri piese — Admin APG Garage', user, nav: 'admin', currentPath: '/admin/cereri-piese', headExtra: CERERI_STYLE, body, bodyEnd }));
}

export default app;
