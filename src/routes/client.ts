import { Hono } from 'hono';
import type { Env, Variables, AppContext } from '../types';
import { requireClient } from '../lib/auth';
import { page } from '../views/layout';
import { esc, numberFormat, dateRo, timeShort, nl2br, serviciuLabel, STATUS_LABEL, todayRo, diffDays } from '../lib/format';
import { notificareProgramareNoua } from '../lib/mailer';

const app = new Hono<{ Bindings: Env; Variables: Variables }>();
// Restrâns la rutele client (un `use('*')` ar deveni global când e montat la `/`)
app.use('/dashboard', requireClient);
app.use('/masini', requireClient);
app.use('/rezervare', requireClient);
app.use('/deviz', requireClient);

/* ============================ DASHBOARD ============================ */
const DASH_STYLE = `<style>
    .tabel-desktop { display: block; }
    .carduri-mobile { display: none; }
    .rez-card { background: var(--dark2); border: 1px solid var(--border); border-left: 4px solid var(--border); padding: 1.2rem; margin-bottom: 1rem; }
    .rez-card.status-asteptare { border-left-color: #f0a500; }
    .rez-card.status-confirmat { border-left-color: #2ecc71; }
    .rez-card.status-respins   { border-left-color: var(--red); }
    .rez-card.status-in_lucru  { border-left-color: #3498db; }
    .rez-card.status-finalizat { border-left-color: var(--grey); }
    .rez-card-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.8rem; gap: 0.5rem; }
    .rez-card-masina { font-family: 'Barlow Condensed', sans-serif; font-size: 1.2rem; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; }
    .rez-card-masina small { display: block; font-family: 'Barlow', sans-serif; font-size: 0.82rem; font-weight: 400; color: var(--grey); letter-spacing: 0; text-transform: none; }
    .rez-card-body { display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem 1rem; margin-bottom: 0.8rem; }
    .rez-card-row { display: flex; flex-direction: column; gap: 0.1rem; }
    .rez-card-row .lbl { font-size: 0.7rem; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase; color: var(--grey); }
    .rez-card-row .val { color: var(--white); font-size: 0.9rem; }
    .rez-card-detalii { font-size: 0.85rem; color: var(--grey); padding-top: 0.7rem; border-top: 1px solid var(--border); }
    .rez-card-detalii.motiv { color: var(--red); }
    @media (max-width: 650px) { .tabel-desktop { display: none; } .carduri-mobile { display: block; } }
</style>`;

app.get('/dashboard', async (c) => {
  const user = c.get('user')!;
  const { results: rezervari } = await c.env.DB.prepare(
    `SELECT r.*, d.id as deviz_id, d.status as deviz_status
     FROM rezervari r
     LEFT JOIN devize d ON d.rezervare_id = r.id AND d.status = 'trimis'
     WHERE r.user_id = ?
     ORDER BY r.data DESC, r.ora_start DESC`,
  ).bind(user.uid).all<any>();

  let body = `<div class="container">
    <div class="page-title">Programările <span>mele</span></div>
    <div class="page-subtitle">Bun venit, ${esc(user.nume)}</div>`;

  if (!rezervari || rezervari.length === 0) {
    body += `<div class="card" style="text-align:center;padding:3rem;">
        <p style="color:var(--grey);margin-bottom:1.5rem;">Nu ai nicio programare încă.</p>
        <a href="/rezervare" class="btn btn-primary">Fă o programare</a>
    </div>`;
  } else {
    const rows = rezervari.map((r) => {
      const devizCell = r.deviz_id
        ? `<a href="/deviz?rezervare_id=${r.id}" style="color:var(--red);font-size:0.85rem;font-weight:600;text-decoration:none;">Vezi deviz →</a>`
        : `<span style="color:#333;font-size:0.82rem;">—</span>`;
      const detalii =
        r.status === 'respins' && r.motiv_respingere
          ? `<span style="color:var(--red);font-size:0.85rem;">${esc(r.motiv_respingere)}</span>`
          : r.descriere
          ? `<span style="color:var(--grey);font-size:0.85rem;">${esc(String(r.descriere).slice(0, 60))}...</span>`
          : '';
      return `<tr>
            <td>${dateRo(r.data)}</td>
            <td>${timeShort(r.ora_start)}</td>
            <td><strong style="font-family:'Barlow Condensed',sans-serif;letter-spacing:1px;">${esc(r.nr_inmatriculare ?? '-')}</strong><br><small style="color:var(--grey)">${esc((r.producator ?? '') + ' ' + (r.model ?? ''))}</small></td>
            <td>${serviciuLabel(r.serviciu_tip)}</td>
            <td>${r.durata} ore</td>
            <td><span class="badge badge-${r.status}">${STATUS_LABEL[r.status] ?? r.status}</span></td>
            <td>${devizCell}</td>
            <td>${detalii}</td>
        </tr>`;
    }).join('');

    const carduri = rezervari.map((r) => {
      const detalii =
        r.status === 'respins' && r.motiv_respingere
          ? `<div class="rez-card-detalii motiv">Motiv: ${esc(r.motiv_respingere)}</div>`
          : r.descriere
          ? `<div class="rez-card-detalii">${esc(r.descriere)}</div>`
          : '';
      const devizBtn = r.deviz_id
        ? `<div style="margin-top:0.8rem;"><a href="/deviz?rezervare_id=${r.id}" class="btn btn-primary" style="width:100%;text-align:center;display:block;padding:0.6rem;">Vezi deviz →</a></div>`
        : '';
      return `<div class="rez-card status-${r.status}">
        <div class="rez-card-header">
            <div class="rez-card-masina">${esc(r.nr_inmatriculare ?? '-')}<small>${esc((r.producator ?? '') + ' ' + (r.model ?? ''))}</small></div>
            <span class="badge badge-${r.status}">${STATUS_LABEL[r.status] ?? r.status}</span>
        </div>
        <div class="rez-card-body">
            <div class="rez-card-row"><span class="lbl">Data</span><span class="val">${dateRo(r.data)}</span></div>
            <div class="rez-card-row"><span class="lbl">Ora</span><span class="val">${timeShort(r.ora_start)}</span></div>
            <div class="rez-card-row"><span class="lbl">Serviciu</span><span class="val">${serviciuLabel(r.serviciu_tip)}</span></div>
            <div class="rez-card-row"><span class="lbl">Durată</span><span class="val">${r.durata} ore</span></div>
        </div>
        ${detalii}
        ${devizBtn}
      </div>`;
    }).join('');

    body += `<div class="tabel-desktop"><div class="card" style="padding:0;overflow-x:auto;"><table>
        <thead><tr><th>Data</th><th>Ora</th><th>Mașina</th><th>Serviciu</th><th>Durată</th><th>Status</th><th>Deviz</th><th>Detalii</th></tr></thead>
        <tbody>${rows}</tbody>
    </table></div></div>
    <div class="carduri-mobile">${carduri}</div>
    <div style="margin-top:1rem;"><a href="/rezervare" class="btn btn-primary" style="width:100%;text-align:center;display:block;">+ Programare nouă</a></div>`;
  }
  body += `</div>`;
  return c.html(page({ title: 'Programările mele — APG Garage', user, nav: 'public', headExtra: DASH_STYLE, body }));
});

/* ============================ MASINI ============================ */
const MASINI_STYLE = `<style>
    .masina-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 1.2rem; margin-bottom: 2rem; }
    .masina-card { background: var(--dark2); border: 1px solid var(--border); border-top: 4px solid var(--border); padding: 1.5rem; position: relative; }
    .masina-card.ok { border-top-color: #2ecc71; } .masina-card.warn { border-top-color: #f0a500; } .masina-card.danger { border-top-color: var(--red); } .masina-card.nodata { border-top-color: var(--grey); }
    .masina-nr { font-family: 'Barlow Condensed', sans-serif; font-size: 1.6rem; font-weight: 800; letter-spacing: 3px; text-transform: uppercase; margin-bottom: 0.3rem; }
    .masina-model { color: var(--grey); font-size: 0.9rem; margin-bottom: 1rem; }
    .masina-info { display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem 1rem; margin-bottom: 1rem; }
    .masina-info-row { display: flex; flex-direction: column; }
    .masina-info-row .lbl { font-size: 0.68rem; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase; color: var(--grey); }
    .masina-info-row .val { font-size: 0.88rem; color: var(--white); }
    .revizie-status { display: flex; align-items: center; gap: 0.5rem; padding: 0.6rem 0.8rem; margin-bottom: 1rem; font-size: 0.82rem; font-weight: 600; }
    .revizie-status.ok { background: #0b2c13; color: #2ecc71; } .revizie-status.warn { background: #2c1f00; color: #f0a500; } .revizie-status.danger { background: #2c0b0b; color: var(--red); } .revizie-status.nodata { background: #1a1a1a; color: var(--grey); }
    .masina-actions { display: flex; gap: 0.5rem; }
    .masina-actions button, .masina-actions a { flex: 1; padding: 0.45rem 0.5rem; font-family: 'Barlow Condensed', sans-serif; font-size: 0.82rem; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; cursor: pointer; border: 1px solid; background: none; text-align: center; text-decoration: none; transition: all 0.15s; }
    .btn-edit { border-color: var(--border); color: var(--grey); } .btn-edit:hover { border-color: var(--white); color: var(--white); }
    .btn-prog { border-color: var(--red); color: var(--red); background: none; } .btn-prog:hover { background: var(--red); color: var(--black); }
    .btn-del { border-color: #333; color: #555; } .btn-del:hover { border-color: var(--red); color: var(--red); }
    .modal { display:none; position:fixed; inset:0; background:rgba(0,0,0,0.85); z-index:999; align-items:center; justify-content:center; padding:1rem; }
    .modal.open { display:flex; }
    .modal-box { background: var(--dark2); border: 1px solid var(--border); padding: 1.5rem; width:100%; max-width:460px; }
    .modal-box h3 { font-family:'Barlow Condensed',sans-serif; font-size:1.4rem; font-weight:800; text-transform:uppercase; margin-bottom:1rem; }
    .adauga-card { background: var(--dark2); border: 1px dashed var(--border); padding: 1.5rem; }
    @media (max-width: 500px) { .masina-grid { grid-template-columns: 1fr; } }
</style>`;

async function loadMasini(env: Env, userId: number) {
  const sql = `SELECT m.*,
        (SELECT MAX(r.data) FROM rezervari r WHERE r.user_id = m.user_id AND r.nr_inmatriculare = m.nr_inmatriculare AND r.serviciu_tip = 'revizie' AND r.status = 'finalizat') as ultima_revizie_auto,
        (SELECT COUNT(*) FROM rezervari r WHERE r.user_id = m.user_id AND r.nr_inmatriculare = m.nr_inmatriculare) as nr_programari
     FROM masini m WHERE m.user_id = ? ORDER BY m.created_at DESC`;
  const { results } = await env.DB.prepare(sql).bind(userId).all<any>();
  return results ?? [];
}

app.get('/masini', async (c) => renderMasini(c, '', ''));

app.post('/masini', async (c) => {
  const user = c.get('user')!;
  const form = await c.req.formData();
  const actiune = String(form.get('actiune') ?? '');
  let error = '';
  let success = '';

  if (actiune === 'adauga') {
    const nr = String(form.get('nr_inmatriculare') ?? '').trim().toUpperCase();
    const prod = String(form.get('producator') ?? '').trim();
    const model = String(form.get('model') ?? '').trim();
    const serie = String(form.get('serie_caroserie') ?? '').trim().toUpperCase();
    if (!nr || !prod || !model) {
      error = 'Completează numărul de înmatriculare, producătorul și modelul.';
    } else {
      const dup = await c.env.DB.prepare('SELECT id FROM masini WHERE user_id = ? AND nr_inmatriculare = ?').bind(user.uid, nr).first();
      if (dup) {
        error = 'Ai deja o mașină cu acest număr de înmatriculare.';
      } else {
        await c.env.DB.prepare('INSERT INTO masini (user_id, nr_inmatriculare, producator, model, serie_caroserie) VALUES (?, ?, ?, ?, ?)').bind(user.uid, nr, prod, model, serie).run();
        success = 'Mașina a fost adăugată în contul tău.';
      }
    }
  } else if (actiune === 'sterge') {
    const id = parseInt(String(form.get('masina_id') ?? '0'), 10);
    await c.env.DB.prepare('DELETE FROM masini WHERE id = ? AND user_id = ?').bind(id, user.uid).run();
    success = 'Mașina a fost ștearsă.';
  } else if (actiune === 'editeaza') {
    const id = parseInt(String(form.get('masina_id') ?? '0'), 10);
    const nr = String(form.get('nr_inmatriculare') ?? '').trim().toUpperCase();
    const prod = String(form.get('producator') ?? '').trim();
    const model = String(form.get('model') ?? '').trim();
    const serie = String(form.get('serie_caroserie') ?? '').trim().toUpperCase();
    if (!nr || !prod || !model) {
      error = 'Completează toate câmpurile obligatorii.';
    } else {
      await c.env.DB.prepare('UPDATE masini SET nr_inmatriculare=?, producator=?, model=?, serie_caroserie=? WHERE id=? AND user_id=?').bind(nr, prod, model, serie, id, user.uid).run();
      success = 'Datele mașinii au fost actualizate.';
    }
  }
  return renderMasini(c, error, success);
});

async function renderMasini(c: AppContext, error: string, success: string) {
  const user = c.get('user')!;
  let masini = await loadMasini(c.env, user.uid);

  // Sincronizeaza data ultimei revizii din programarile finalizate
  for (const m of masini) {
    if (m.ultima_revizie_auto && m.ultima_revizie_auto !== m.data_ultima_revizie) {
      await c.env.DB.prepare('UPDATE masini SET data_ultima_revizie = ?, notificare_trimisa = 0 WHERE id = ?').bind(m.ultima_revizie_auto, m.id).run();
    }
  }
  masini = await loadMasini(c.env, user.uid);

  const today = todayRo();
  const carduri = masini.map((m: any) => {
    const revizie = m.data_ultima_revizie;
    const zileDeLa = revizie ? diffDays(String(revizie).slice(0, 10), today) : null;
    const zilePana = revizie ? 365 - (zileDeLa as number) : null;
    let status: string, statusText: string;
    if (!revizie) { status = 'nodata'; statusText = 'Nicio revizie înregistrată'; }
    else if ((zileDeLa as number) >= 365) { status = 'danger'; statusText = 'Revizie depășită cu ' + ((zileDeLa as number) - 365) + ' zile'; }
    else if ((zilePana as number) <= 30) { status = 'warn'; statusText = 'Revizie necesară în ' + zilePana + ' zile'; }
    else { status = 'ok'; statusText = 'Revizie la zi — mai sunt ' + zilePana + ' zile'; }
    const icon = ({ ok: '✓', warn: '⚠', danger: '✕', nodata: '—' } as Record<string, string>)[status];
    return `<div class="masina-card ${status}">
        <div class="masina-nr">${esc(m.nr_inmatriculare)}</div>
        <div class="masina-model">${esc(m.producator + ' ' + m.model)}</div>
        <div class="masina-info">
            <div class="masina-info-row"><span class="lbl">Serie caroserie</span><span class="val">${esc(m.serie_caroserie || '—')}</span></div>
            <div class="masina-info-row"><span class="lbl">Programări</span><span class="val">${m.nr_programari}</span></div>
            <div class="masina-info-row" style="grid-column:1/-1;"><span class="lbl">Ultima revizie</span><span class="val">${revizie ? dateRo(revizie) : '—'}</span></div>
        </div>
        <div class="revizie-status ${status}"><span>${icon}</span><span>${statusText}</span></div>
        <div class="masina-actions">
            <button class="btn-edit" onclick="openEdit(${m.id}, '${esc(m.nr_inmatriculare)}', '${esc(m.producator)}', '${esc(m.model)}', '${esc(m.serie_caroserie ?? '')}')">Editează</button>
            <a href="/rezervare" class="btn-prog">Programare</a>
            <button class="btn-del" onclick="confirmaStergere(${m.id}, '${esc(m.nr_inmatriculare)}')">Șterge</button>
        </div>
    </div>`;
  }).join('');

  const body = `<div class="container">
    <div class="page-title">Mașinile <span>mele</span></div>
    <div class="page-subtitle">Urmărește istoricul și reviziile mașinilor tale</div>
    ${error ? `<div class="alert alert-error">${esc(error)}</div>` : ''}
    ${success ? `<div class="alert alert-success">${esc(success)}</div>` : ''}
    <div class="masina-grid">
        ${carduri}
        <div class="adauga-card">
            <div class="section-label">Adaugă mașină</div>
            <form method="POST">
                <input type="hidden" name="actiune" value="adauga">
                <div class="form-group"><label>Număr înmatriculare *</label><input type="text" name="nr_inmatriculare" placeholder="ex: B 123 ABC" style="text-transform:uppercase;" required></div>
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:0 1rem;">
                    <div class="form-group"><label>Producător *</label><input type="text" name="producator" placeholder="ex: Volkswagen" required></div>
                    <div class="form-group"><label>Model *</label><input type="text" name="model" placeholder="ex: Golf 7" required></div>
                </div>
                <div class="form-group"><label>Serie caroserie (VIN)</label><input type="text" name="serie_caroserie" placeholder="ex: WVWZZZ1KZ..." style="text-transform:uppercase;"></div>
                <button type="submit" class="btn btn-primary" style="width:100%;">Adaugă mașina</button>
            </form>
        </div>
    </div>
  </div>
  <div class="modal" id="modal-edit"><div class="modal-box">
    <h3>Editează <span style="color:var(--red)">mașina</span></h3>
    <form method="POST">
        <input type="hidden" name="actiune" value="editeaza"><input type="hidden" name="masina_id" id="edit-id">
        <div class="form-group"><label>Număr înmatriculare *</label><input type="text" name="nr_inmatriculare" id="edit-nr" style="text-transform:uppercase;" required></div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:0 1rem;">
            <div class="form-group"><label>Producător *</label><input type="text" name="producator" id="edit-prod" required></div>
            <div class="form-group"><label>Model *</label><input type="text" name="model" id="edit-model" required></div>
        </div>
        <div class="form-group"><label>Serie caroserie (VIN)</label><input type="text" name="serie_caroserie" id="edit-serie" style="text-transform:uppercase;"></div>
        <div style="display:flex;gap:1rem;margin-top:0.5rem;"><button type="submit" class="btn btn-primary">Salvează</button><button type="button" class="btn btn-outline" onclick="closeEdit()">Anulează</button></div>
    </form>
  </div></div>
  <form method="POST" id="form-sterge" style="display:none;"><input type="hidden" name="actiune" value="sterge"><input type="hidden" name="masina_id" id="sterge-id"></form>`;

  const bodyEnd = `<script>
    function openEdit(id, nr, prod, model, serie){document.getElementById('edit-id').value=id;document.getElementById('edit-nr').value=nr;document.getElementById('edit-prod').value=prod;document.getElementById('edit-model').value=model;document.getElementById('edit-serie').value=serie;document.getElementById('modal-edit').classList.add('open');}
    function closeEdit(){document.getElementById('modal-edit').classList.remove('open');}
    document.getElementById('modal-edit').addEventListener('click',function(e){if(e.target===this)closeEdit();});
    function confirmaStergere(id,nr){if(confirm('Ștergi mașina '+nr+'? Această acțiune nu poate fi anulată.')){document.getElementById('sterge-id').value=id;document.getElementById('form-sterge').submit();}}
  </script>`;
  return c.html(page({ title: 'Mașinile mele — APG Garage', user, nav: 'public', headExtra: MASINI_STYLE, body, bodyEnd }));
}

/* ============================ REZERVARE ============================ */
async function getSloturiDisponibile(env: Env, data: string, durata: number): Promise<string[]> {
  let allSlots = durata === 4 ? ['09:00', '13:00'] : ['09:00', '11:00', '13:00', '15:00'];

  const blocat = await env.DB.prepare('SELECT id FROM zile_blocate WHERE data = ?').bind(data).first();
  if (blocat) return [];

  const dow = new Date(data + 'T00:00:00Z').getUTCDay(); // 0=Dum..6=Sam
  const iso = dow === 0 ? 7 : dow;
  if (iso >= 6) return [];

  const { results: ocupate } = await env.DB.prepare(
    `SELECT ora_start, durata FROM rezervari WHERE data = ? AND status IN ('asteptare','confirmat','in_lucru')`,
  ).bind(data).all<{ ora_start: string; durata: number }>();

  const toMin = (hhmm: string) => {
    const [h, m] = hhmm.slice(0, 5).split(':').map(Number);
    return h * 60 + m;
  };

  return allSlots.filter((slot) => {
    const sStart = toMin(slot);
    const sEnd = sStart + durata * 60;
    for (const rez of ocupate ?? []) {
      const rStart = toMin(rez.ora_start);
      const rEnd = rStart + rez.durata * 60;
      if (sStart < rEnd && sEnd > rStart) return false;
    }
    return true;
  });
}

app.get('/rezervare', async (c) => {
  // AJAX sloturi
  if (c.req.query('ajax_slots') !== undefined) {
    const data = c.req.query('data') ?? '';
    const durata = parseInt(c.req.query('durata') ?? '2', 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) return c.json([]);
    return c.json(await getSloturiDisponibile(c.env, data, durata));
  }
  return renderRezervare(c, '', false, {});
});

app.post('/rezervare', async (c) => {
  const user = c.get('user')!;
  const form = await c.req.formData();
  const serviciu = String(form.get('serviciu_tip') ?? '');
  const descriere = String(form.get('descriere') ?? '').trim();
  const data = String(form.get('data') ?? '');
  const ora = String(form.get('ora_start') ?? '');
  const durata = parseInt(String(form.get('durata') ?? '2'), 10);
  const nr = String(form.get('nr_inmatriculare') ?? '').trim().toUpperCase();
  const producator = String(form.get('producator') ?? '').trim();
  const model = String(form.get('model') ?? '').trim();
  const vals = { serviciu_tip: serviciu, descriere, nr_inmatriculare: nr, producator, model, durata: String(durata) };

  let error = '';
  if (!serviciu || !data || !ora || ![2, 4].includes(durata)) {
    error = 'Completează toate câmpurile obligatorii.';
  } else if (!nr || !producator || !model) {
    error = 'Completează datele mașinii (număr înmatriculare, producător, model).';
  } else if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) {
    error = 'Dată invalidă.';
  } else if (data < todayRo()) {
    error = 'Nu poți face rezervări în trecut.';
  } else {
    const disponibile = await getSloturiDisponibile(c.env, data, durata);
    if (!disponibile.includes(ora)) {
      error = 'Slotul selectat nu mai este disponibil. Te rugăm alege altul.';
    } else {
      await c.env.DB.prepare('INSERT INTO rezervari (user_id, nr_inmatriculare, producator, model, serviciu_tip, descriere, data, ora_start, durata) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
        .bind(user.uid, nr, producator, model, serviciu, descriere, data, ora + ':00', durata).run();
      const u = await c.env.DB.prepare('SELECT email FROM users WHERE id = ?').bind(user.uid).first<{ email: string }>();
      if (u) c.executionCtx.waitUntil(notificareProgramareNoua(c.env, user.nume, u.email, nr, producator, model, serviciu, data, ora + ':00', durata));
      return renderRezervare(c, '', true, {});
    }
  }
  return renderRezervare(c, error, false, vals);
});

const REZ_STYLE = `<style>
    .rez-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 2rem; align-items: start; }
    @media (max-width: 700px) { .rez-grid { grid-template-columns: 1fr; gap: 0; } }
    .masina-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0 1rem; }
    @media (max-width: 500px) { .masina-grid { grid-template-columns: 1fr; } }
    @media (max-width: 400px) { .cal-day { padding: 0.35rem 0; font-size: 0.8rem; } .cal-day-name { font-size: 0.62rem; } .cal-grid { gap: 3px; } }
    .calendar { user-select: none; }
    .cal-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 1rem; }
    .cal-header button { background: none; border: 1px solid var(--border); color: var(--white); padding: 0.3rem 0.8rem; cursor: pointer; font-size: 1rem; transition: border-color 0.2s; }
    .cal-header button:hover { border-color: var(--red); }
    .cal-month { font-family: 'Barlow Condensed', sans-serif; font-size: 1.2rem; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; }
    .cal-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 4px; }
    .cal-day-name { text-align: center; font-size: 0.7rem; font-weight: 600; letter-spacing: 1px; color: var(--grey); padding: 0.3rem 0; text-transform: uppercase; }
    .cal-day { text-align: center; padding: 0.5rem 0; font-size: 0.9rem; border: 1px solid transparent; cursor: default; transition: all 0.15s; }
    .cal-day.available { cursor: pointer; border-color: var(--border); color: var(--white); }
    .cal-day.available:hover { border-color: var(--red); color: var(--red); }
    .cal-day.selected { background: var(--red); color: var(--black) !important; border-color: var(--red); }
    .cal-day.past, .cal-day.weekend, .cal-day.blocked { color: #333; }
    .cal-day.empty { border: none; }
    .slots-wrap { margin-top: 1rem; }
    .slots-title { font-size: 0.75rem; font-weight: 600; letter-spacing: 1.5px; text-transform: uppercase; color: var(--grey); margin-bottom: 0.6rem; }
    .slots-grid { display: flex; flex-wrap: wrap; gap: 0.5rem; }
    .slot-btn { padding: 0.5rem 1.2rem; border: 1px solid var(--border); background: none; color: var(--white); font-family: 'Barlow Condensed', sans-serif; font-size: 1rem; font-weight: 600; letter-spacing: 1px; cursor: pointer; transition: all 0.15s; }
    .slot-btn:hover { border-color: var(--red); color: var(--red); }
    .slot-btn.active { background: var(--red); border-color: var(--red); color: var(--black); }
    .section-divider { font-size: 0.72rem; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; color: var(--red); margin: 1.2rem 0 0.8rem; padding-bottom: 0.4rem; border-bottom: 1px solid var(--border); }
    .success-box { text-align: center; padding: 3rem 2rem; }
    .success-box .icon { font-size: 3rem; margin-bottom: 1rem; }
    .success-box h2 { font-family: 'Barlow Condensed', sans-serif; font-size: 1.8rem; font-weight: 800; text-transform: uppercase; margin-bottom: 0.5rem; }
    .success-box p { color: var(--grey); margin-bottom: 1.5rem; }
</style>`;

function renderRezervare(c: AppContext, error: string, success: boolean, v: Record<string, string>) {
  const user = c.get('user')!;
  const sel = (name: string, val: string) => ((v[name] ?? (name === 'durata' ? '2' : '')) === val ? 'selected' : '');
  let body = `<div class="container">
    <div class="page-title">Programare <span>nouă</span></div>
    <div class="page-subtitle">Completează datele mașinii, alege serviciul și data dorită</div>`;
  if (success) {
    body += `<div class="card success-box"><div class="icon">✓</div><h2>Programare <span style="color:var(--red)">trimisă</span></h2><p>Programarea ta a fost înregistrată și este în așteptarea confirmării din partea service-ului.</p><a href="/dashboard" class="btn btn-primary">Vezi programările mele</a></div></div>`;
    return c.html(page({ title: 'Programare nouă — APG Garage', user, nav: 'public', headExtra: REZ_STYLE, body }));
  }
  body += `${error ? `<div class="alert alert-error">${esc(error)}</div>` : ''}
    <form method="POST" id="rez-form">
        <input type="hidden" name="data" id="input-data"><input type="hidden" name="ora_start" id="input-ora">
        <div class="rez-grid">
            <div><div class="card">
                <div class="section-divider">Datele mașinii</div>
                <div class="form-group"><label>Număr înmatriculare *</label><input type="text" name="nr_inmatriculare" value="${esc(v.nr_inmatriculare ?? '')}" placeholder="ex: B 123 ABC" style="text-transform:uppercase;" required></div>
                <div class="masina-grid">
                    <div class="form-group"><label>Producător *</label><input type="text" name="producator" value="${esc(v.producator ?? '')}" placeholder="ex: Volkswagen" required></div>
                    <div class="form-group"><label>Model *</label><input type="text" name="model" value="${esc(v.model ?? '')}" placeholder="ex: Golf 7" required></div>
                </div>
                <div class="section-divider">Serviciu</div>
                <div class="form-group"><label>Tip serviciu *</label><select name="serviciu_tip" id="serviciu_tip" required>
                    <option value="">Alege...</option>
                    <option value="revizie" ${sel('serviciu_tip', 'revizie')}>Revizie</option>
                    <option value="reparatie" ${sel('serviciu_tip', 'reparatie')}>Reparație mecanică</option>
                    <option value="verificare_rampa" ${sel('serviciu_tip', 'verificare_rampa')}>Verificare rampă</option>
                </select></div>
                <div class="form-group"><label>Durată estimată *</label><select name="durata" id="durata" required>
                    <option value="2" ${sel('durata', '2')}>2 ore</option>
                    <option value="4" ${sel('durata', '4')}>4 ore (zi întreagă)</option>
                </select></div>
                <div class="form-group"><label>Descriere problemă</label><textarea name="descriere" placeholder="Descrie pe scurt problema sau lucrarea dorită...">${esc(v.descriere ?? '')}</textarea></div>
            </div></div>
            <div>
                <div class="card">
                    <div class="section-divider" style="margin-top:0;">Alege data și ora</div>
                    <div class="calendar" id="calendar"></div>
                    <div class="slots-wrap" id="slots-wrap" style="display:none;"><div class="slots-title">Ore disponibile</div><div class="slots-grid" id="slots-grid"></div></div>
                    <div id="slots-loading" style="display:none;color:var(--grey);font-size:0.9rem;margin-top:1rem;">Se încarcă...</div>
                    <div id="slots-empty" style="display:none;color:var(--red);font-size:0.9rem;margin-top:1rem;">Nu există ore disponibile în această zi.</div>
                </div>
                <div id="summary" style="display:none;" class="card"><div style="font-size:0.8rem;color:var(--grey);letter-spacing:1px;text-transform:uppercase;margin-bottom:0.5rem;">Programare selectată</div><div id="summary-text" style="font-family:'Barlow Condensed',sans-serif;font-size:1.3rem;font-weight:700;"></div></div>
                <button type="submit" class="btn btn-primary" id="btn-submit" style="width:100%;display:none;font-size:1.1rem;">Trimite programarea</button>
            </div>
        </div>
    </form>
  </div>`;
  const bodyEnd = `<script>${REZ_SCRIPT}</script>`;
  return c.html(page({ title: 'Programare nouă — APG Garage', user, nav: 'public', headExtra: REZ_STYLE, body, bodyEnd }));
}

const REZ_SCRIPT = `(function(){
  const today=new Date();today.setHours(0,0,0,0);
  let currentYear=today.getFullYear(),currentMonth=today.getMonth(),selectedDate=null,selectedOra=null;
  const months=['Ianuarie','Februarie','Martie','Aprilie','Mai','Iunie','Iulie','August','Septembrie','Octombrie','Noiembrie','Decembrie'];
  const days=['Lu','Ma','Mi','Jo','Vi','Sâ','Du'];
  function renderCalendar(){
    const cal=document.getElementById('calendar');const first=new Date(currentYear,currentMonth,1);const last=new Date(currentYear,currentMonth+1,0);
    let startDay=first.getDay();startDay=startDay===0?6:startDay-1;
    let html='<div class="cal-header"><button type="button" id="prev-month">&#8592;</button><div class="cal-month">'+months[currentMonth]+' '+currentYear+'</div><button type="button" id="next-month">&#8594;</button></div><div class="cal-grid">';
    days.forEach(function(d){html+='<div class="cal-day-name">'+d+'</div>';});
    for(let i=0;i<startDay;i++){html+='<div class="cal-day empty"></div>';}
    for(let d=1;d<=last.getDate();d++){
      const date=new Date(currentYear,currentMonth,d);
      const dateStr=date.getFullYear()+'-'+String(date.getMonth()+1).padStart(2,'0')+'-'+String(d).padStart(2,'0');
      const isWeekend=date.getDay()===0||date.getDay()===6;const isPast=date<today;let cls='cal-day';
      if(isPast)cls+=' past';else if(isWeekend)cls+=' weekend';else{cls+=' available';if(selectedDate===dateStr)cls+=' selected';}
      html+='<div class="'+cls+'" data-date="'+dateStr+'">'+d+'</div>';
    }
    html+='</div>';cal.innerHTML=html;
    document.getElementById('prev-month').addEventListener('click',function(){currentMonth--;if(currentMonth<0){currentMonth=11;currentYear--;}renderCalendar();});
    document.getElementById('next-month').addEventListener('click',function(){currentMonth++;if(currentMonth>11){currentMonth=0;currentYear++;}renderCalendar();});
    cal.querySelectorAll('.cal-day.available').forEach(function(el){el.addEventListener('click',function(){selectedDate=el.dataset.date;selectedOra=null;document.getElementById('input-data').value=selectedDate;document.getElementById('input-ora').value='';document.getElementById('summary').style.display='none';document.getElementById('btn-submit').style.display='none';renderCalendar();loadSlots();});});
  }
  function loadSlots(){
    if(!selectedDate)return;const durata=document.getElementById('durata').value;
    document.getElementById('slots-wrap').style.display='none';document.getElementById('slots-loading').style.display='block';document.getElementById('slots-empty').style.display='none';
    fetch('/rezervare?ajax_slots=1&data='+selectedDate+'&durata='+durata).then(function(r){return r.json();}).then(function(slots){
      document.getElementById('slots-loading').style.display='none';
      if(!slots.length){document.getElementById('slots-empty').style.display='block';return;}
      document.getElementById('slots-wrap').style.display='block';const grid=document.getElementById('slots-grid');grid.innerHTML='';
      slots.forEach(function(slot){const btn=document.createElement('button');btn.type='button';btn.className='slot-btn'+(selectedOra===slot?' active':'');btn.textContent=slot;btn.addEventListener('click',function(){selectedOra=slot;document.getElementById('input-ora').value=slot;grid.querySelectorAll('.slot-btn').forEach(function(b){b.classList.remove('active');});btn.classList.add('active');updateSummary();});grid.appendChild(btn);});
    });
  }
  function updateSummary(){
    if(!selectedDate||!selectedOra)return;const durata=document.getElementById('durata').value;
    const sEl=document.getElementById('serviciu_tip');const serviciu=sEl.options[sEl.selectedIndex]?sEl.options[sEl.selectedIndex].text:'';
    const nr=document.querySelector('input[name="nr_inmatriculare"]').value.toUpperCase();const p=selectedDate.split('-');
    document.getElementById('summary-text').textContent=nr+' — '+serviciu+' — '+p[2]+'.'+p[1]+'.'+p[0]+' ora '+selectedOra+' ('+durata+'h)';
    document.getElementById('summary').style.display='block';document.getElementById('btn-submit').style.display='block';
  }
  document.getElementById('durata').addEventListener('change',function(){selectedOra=null;document.getElementById('input-ora').value='';document.getElementById('summary').style.display='none';document.getElementById('btn-submit').style.display='none';if(selectedDate)loadSlots();});
  document.getElementById('rez-form').addEventListener('submit',function(e){if(!selectedDate||!selectedOra){e.preventDefault();alert('Alege o dată și o oră înainte de a trimite programarea.');}});
  renderCalendar();
})();`;

/* ============================ DEVIZ (client) ============================ */
const DEVIZ_STYLE = `<style>
    .deviz-wrap { max-width: 800px; }
    .deviz-header { background: var(--black); border: 1px solid var(--border); border-top: 4px solid var(--red); padding: 1.5rem; margin-bottom: 1.5rem; }
    .deviz-header h2 { font-family: 'Barlow Condensed', sans-serif; font-size: 1.6rem; font-weight: 800; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 1rem; }
    .deviz-header h2 span { color: var(--red); }
    .deviz-meta { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; }
    @media (max-width: 500px) { .deviz-meta { grid-template-columns: 1fr 1fr; } }
    .deviz-meta-item .lbl { font-size: 0.7rem; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase; color: var(--grey); margin-bottom: 0.2rem; }
    .deviz-meta-item .val { font-size: 0.92rem; color: var(--white); }
    .deviz-section { margin-bottom: 1.5rem; }
    .deviz-section-title { font-family: 'Barlow Condensed', sans-serif; font-size: 1.05rem; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; padding: 0.6rem 1rem; background: var(--black); border-left: 4px solid var(--red); }
    .deviz-table { width: 100%; border-collapse: collapse; background: var(--dark2); }
    .deviz-table th { background: var(--black); color: var(--grey); font-size: 0.72rem; font-weight: 600; letter-spacing: 1.5px; text-transform: uppercase; padding: 0.6rem 1rem; text-align: left; border-bottom: 1px solid var(--border); }
    .deviz-table td { padding: 0.75rem 1rem; border-bottom: 1px solid var(--border); font-size: 0.9rem; }
    .deviz-table td:last-child { text-align: right; font-family: 'Barlow Condensed', sans-serif; font-size: 1rem; font-weight: 700; color: var(--red); }
    .deviz-table th:last-child { text-align: right; }
    .deviz-table .cat-badge { display: inline-block; font-size: 0.7rem; color: var(--grey); background: var(--black); padding: 0.1rem 0.5rem; margin-left: 0.5rem; vertical-align: middle; }
    .total-final { background: var(--black); border: 1px solid var(--border); border-top: 2px solid var(--red); padding: 1.2rem 1.5rem; display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; }
    .total-final .label { color: var(--grey); font-size: 0.9rem; text-transform: uppercase; letter-spacing: 1px; }
    .total-final .valoare { font-family: 'Barlow Condensed', sans-serif; font-size: 2rem; font-weight: 800; color: var(--red); }
    .obs-box { background: var(--dark2); border: 1px solid var(--border); border-left: 4px solid var(--grey); padding: 1rem 1.2rem; margin-bottom: 1.5rem; color: var(--grey-light); font-size: 0.9rem; line-height: 1.6; }
    .obs-box .obs-label { font-size: 0.7rem; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase; color: var(--grey); margin-bottom: 0.4rem; }
    @media (max-width: 550px) { .deviz-table thead { display: none; } .deviz-table tr { display: flex; flex-direction: column; padding: 0.8rem 1rem; border-bottom: 1px solid var(--border); } .deviz-table td { padding: 0.1rem 0; border: none; font-size: 0.88rem; } .deviz-table td:last-child { text-align: left; margin-top: 0.3rem; } }
</style>`;

app.get('/deviz', async (c) => {
  const user = c.get('user')!;
  const rezervareId = parseInt(c.req.query('rezervare_id') ?? '0', 10);
  if (!rezervareId) return c.redirect('/dashboard');

  const rezervare = await c.env.DB.prepare('SELECT r.*, u.nume as client_nume FROM rezervari r JOIN users u ON u.id = r.user_id WHERE r.id = ? AND r.user_id = ?').bind(rezervareId, user.uid).first<any>();
  if (!rezervare) return c.redirect('/dashboard');
  const deviz = await c.env.DB.prepare(`SELECT * FROM devize WHERE rezervare_id = ? AND status = 'trimis'`).bind(rezervareId).first<any>();
  if (!deviz) return c.redirect('/dashboard');
  const { results: randuri } = await c.env.DB.prepare('SELECT * FROM deviz_randuri WHERE deviz_id = ? ORDER BY tip, categorie, id').bind(deviz.id).all<any>();

  const piese = (randuri ?? []).filter((r) => r.tip === 'piesa');
  const manopera = (randuri ?? []).filter((r) => r.tip === 'manopera');
  const total = (randuri ?? []).reduce((s, r) => s + Number(r.total), 0);

  const pieseTable = piese.length ? `<div class="deviz-section"><div class="deviz-section-title">🔧 Piese</div><table class="deviz-table">
        <thead><tr><th>Denumire</th><th>Cantitate</th><th>Preț unitar</th><th>Total</th></tr></thead><tbody>
        ${piese.map((r) => `<tr><td>${esc(r.nume)}${r.categorie ? ` <span class="cat-badge">${esc(r.categorie)}</span>` : ''}</td><td>${numberFormat(r.cantitate, 0)} buc</td><td>${numberFormat(r.pret_unitar, 2)} lei</td><td>${numberFormat(r.total, 2)} lei</td></tr>`).join('')}
        </tbody></table></div>` : '';
  const manoperaTable = manopera.length ? `<div class="deviz-section"><div class="deviz-section-title">⚙️ Manoperă</div><table class="deviz-table">
        <thead><tr><th>Serviciu</th><th>Cantitate</th><th>Preț unitar</th><th>Total</th></tr></thead><tbody>
        ${manopera.map((r) => `<tr><td>${esc(r.nume)}</td><td>${numberFormat(r.cantitate, 1)}</td><td>${numberFormat(r.pret_unitar, 2)} lei</td><td>${numberFormat(r.total, 2)} lei</td></tr>`).join('')}
        </tbody></table></div>` : '';
  const obs = deviz.observatii ? `<div class="obs-box"><div class="obs-label">Observații</div>${nl2br(deviz.observatii)}</div>` : '';

  const body = `<div class="container"><div class="deviz-wrap">
    <div class="page-title">Devizul <span>tău</span></div>
    <div class="page-subtitle"><a href="/dashboard" style="color:var(--red);text-decoration:none;">← Înapoi la programări</a></div>
    <div class="deviz-header"><h2>APG <span>Garage</span></h2><div class="deviz-meta">
        <div class="deviz-meta-item"><div class="lbl">Client</div><div class="val">${esc(rezervare.client_nume)}</div></div>
        <div class="deviz-meta-item"><div class="lbl">Mașina</div><div class="val">${esc(rezervare.nr_inmatriculare ?? '-')}<br><small style="color:var(--grey)">${esc((rezervare.producator ?? '') + ' ' + (rezervare.model ?? ''))}</small></div></div>
        <div class="deviz-meta-item"><div class="lbl">Data</div><div class="val">${dateRo(rezervare.data)}</div></div>
        <div class="deviz-meta-item"><div class="lbl">Serviciu</div><div class="val">${serviciuLabel(rezervare.serviciu_tip)}</div></div>
        <div class="deviz-meta-item"><div class="lbl">Nr. deviz</div><div class="val">#${deviz.id}</div></div>
        <div class="deviz-meta-item"><div class="lbl">Data deviz</div><div class="val">${dateRo(deviz.updated_at)}</div></div>
    </div></div>
    ${pieseTable}
    ${manoperaTable}
    ${obs}
    <div class="total-final"><span class="label">Total de plată</span><span class="valoare">${numberFormat(total, 2)} lei</span></div>
    <a href="/dashboard" class="btn btn-outline">← Înapoi</a>
  </div></div>`;
  return c.html(page({ title: 'Deviz — APG Garage', user, nav: 'public', headExtra: DEVIZ_STYLE, body }));
});

export default app;
