import { Hono } from 'hono';
import type { Env, Variables, AppContext } from '../../types';
import { page } from '../../views/layout';
import { esc, numberFormat } from '../../lib/format';
import { parseOrdine } from '../../lib/form';

const app = new Hono<{ Bindings: Env; Variables: Variables }>();

const jsAttr = (s: string) => esc(s).replace(/'/g, '&#039;');

/* ============================ SERVICII ============================ */
const SVC_STYLE = `<style>
    .svc-list { margin-bottom: 2rem; }
    .svc-row { background: var(--dark2); border: 1px solid var(--border); border-left: 4px solid var(--border); padding: 1.2rem 1.5rem; margin-bottom: 0.8rem; display: grid; grid-template-columns: 32px 1fr auto; gap: 1rem; align-items: center; transition: border-color 0.15s; }
    .svc-row.activ { border-left-color: #2ecc71; } .svc-row.inactiv { border-left-color: #444; opacity: 0.6; }
    .drag-handle { color: #444; cursor: grab; font-size: 1.2rem; text-align: center; user-select: none; }
    .svc-info h3 { font-family: 'Barlow Condensed', sans-serif; font-size: 1.1rem; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 0.2rem; }
    .svc-info .meta { font-size: 0.8rem; color: var(--grey); display: flex; gap: 1rem; flex-wrap: wrap; }
    .svc-info .descr { font-size: 0.85rem; color: var(--grey); margin-top: 0.3rem; }
    .svc-actions { display: flex; gap: 0.5rem; flex-shrink: 0; }
    .svc-actions button { padding: 0.35rem 0.8rem; font-family: 'Barlow Condensed', sans-serif; font-size: 0.8rem; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; cursor: pointer; border: 1px solid; background: none; transition: all 0.15s; }
    .btn-edit-svc { border-color: var(--border); color: var(--grey); } .btn-edit-svc:hover { border-color: var(--white); color: var(--white); }
    .btn-toggle { border-color: #1e8449; color: #2ecc71; } .btn-toggle:hover { background: #1e8449; color: var(--white); }
    .btn-toggle.off { border-color: #444; color: #666; } .btn-toggle.off:hover { background: #444; color: var(--white); }
    .btn-del-svc { border-color: #333; color: #555; } .btn-del-svc:hover { border-color: var(--red); color: var(--red); }
    .modal { display:none; position:fixed; inset:0; background:rgba(0,0,0,0.85); z-index:999; align-items:center; justify-content:center; padding:1rem; }
    .modal.open { display:flex; }
    .modal-box { background: var(--dark2); border: 1px solid var(--border); padding: 1.8rem; width:100%; max-width:480px; }
    .modal-box h3 { font-family:'Barlow Condensed',sans-serif; font-size:1.4rem; font-weight:800; text-transform:uppercase; margin-bottom:1.2rem; }
    .adauga-form { background: var(--dark2); border: 1px solid var(--border); border-top: 4px solid var(--red); padding: 1.8rem; margin-bottom: 2rem; }
    .adauga-form h3 { font-family:'Barlow Condensed',sans-serif; font-size:1.2rem; font-weight:700; text-transform:uppercase; letter-spacing:1px; margin-bottom:1.2rem; }
    .fg3 { display: grid; grid-template-columns: 1fr 1fr 120px; gap: 0 1rem; }
    @media (max-width: 600px) { .fg3 { grid-template-columns: 1fr; } .svc-row { grid-template-columns: 1fr auto; } .drag-handle { display: none; } .svc-actions { flex-wrap: wrap; } }
    .dragging { opacity: 0.4; } .drag-over { border-top: 2px solid var(--red); }
</style>`;

app.post('/servicii', async (c) => {
  const form = await c.req.formData();
  const actiune = String(form.get('actiune') ?? '');
  let error = '';
  let success = '';
  if (actiune === 'reordoneaza') {
    for (const { id, ordine } of parseOrdine(form)) {
      await c.env.DB.prepare('UPDATE servicii SET ordine=? WHERE id=?').bind(ordine, id).run();
    }
    return c.json({ ok: true });
  }
  if (actiune === 'toggle') {
    await c.env.DB.prepare('UPDATE servicii SET activ = 1 - activ WHERE id=?').bind(parseInt(String(form.get('serviciu_id') ?? '0'), 10)).run();
    return c.redirect('/admin/servicii');
  }
  if (actiune === 'adauga') {
    const nume = String(form.get('nume') ?? '').trim();
    const descr = String(form.get('descriere') ?? '').trim();
    const durata = parseInt(String(form.get('durata_ore') ?? '2'), 10);
    if (!nume) error = 'Numele serviciului este obligatoriu.';
    else {
      const row = await c.env.DB.prepare('SELECT MAX(ordine) as m FROM servicii').first<{ m: number }>();
      await c.env.DB.prepare('INSERT INTO servicii (nume, descriere, durata_ore, ordine) VALUES (?, ?, ?, ?)').bind(nume, descr, durata, (row?.m ?? 0) + 1).run();
      success = 'Serviciul a fost adăugat.';
    }
  } else if (actiune === 'editeaza') {
    const id = parseInt(String(form.get('serviciu_id') ?? '0'), 10);
    const nume = String(form.get('nume') ?? '').trim();
    const descr = String(form.get('descriere') ?? '').trim();
    const durata = parseInt(String(form.get('durata_ore') ?? '2'), 10);
    const activ = form.get('activ') !== null ? 1 : 0;
    if (!nume) error = 'Numele serviciului este obligatoriu.';
    else {
      await c.env.DB.prepare('UPDATE servicii SET nume=?, descriere=?, durata_ore=?, activ=? WHERE id=?').bind(nume, descr, durata, activ, id).run();
      success = 'Serviciul a fost actualizat.';
    }
  } else if (actiune === 'sterge') {
    await c.env.DB.prepare('DELETE FROM servicii WHERE id=?').bind(parseInt(String(form.get('serviciu_id') ?? '0'), 10)).run();
    success = 'Serviciul a fost șters.';
  }
  return renderServicii(c, error, success);
});

app.get('/servicii', async (c) => renderServicii(c, '', ''));

async function renderServicii(c: AppContext, error: string, success: string) {
  const user = c.get('user')!;
  const { results: servicii } = await c.env.DB.prepare('SELECT * FROM servicii ORDER BY ordine ASC, id ASC').all<any>();

  const rows = (servicii ?? []).map((s) => `<div class="svc-row ${s.activ ? 'activ' : 'inactiv'}" data-id="${s.id}" draggable="true">
    <div class="drag-handle" title="Trage pentru reordonare">⠿</div>
    <div class="svc-info"><h3>${esc(s.nume)}</h3>
        <div class="meta"><span>⏱ ${s.durata_ore} ore</span><span>${s.activ ? '✓ Activ' : '✕ Inactiv'}</span></div>
        ${s.descriere ? `<div class="descr">${esc(s.descriere)}</div>` : ''}
    </div>
    <div class="svc-actions">
        <button class="btn-edit-svc" onclick="openEdit(${s.id}, '${jsAttr(s.nume)}', '${jsAttr(s.descriere ?? '')}', ${s.durata_ore}, ${s.activ})">Editează</button>
        <form method="POST" style="display:inline;"><input type="hidden" name="actiune" value="toggle"><input type="hidden" name="serviciu_id" value="${s.id}"><button type="submit" class="btn-toggle ${s.activ ? '' : 'off'}">${s.activ ? 'Dezactivează' : 'Activează'}</button></form>
        <form method="POST" style="display:inline;" onsubmit="return confirm('Ștergi serviciul ${jsAttr(s.nume)}?')"><input type="hidden" name="actiune" value="sterge"><input type="hidden" name="serviciu_id" value="${s.id}"><button type="submit" class="btn-del-svc">Șterge</button></form>
    </div>
  </div>`).join('');

  const body = `<div class="container">
    <div class="page-title">Gestionare <span>servicii</span></div>
    <div class="page-subtitle">Adaugă, editează sau dezactivează serviciile oferite de service.</div>
    ${error ? `<div class="alert alert-error">${esc(error)}</div>` : ''}
    ${success ? `<div class="alert alert-success">${esc(success)}</div>` : ''}
    <div class="adauga-form"><h3>+ Serviciu nou</h3>
        <form method="POST"><input type="hidden" name="actiune" value="adauga">
            <div class="fg3">
                <div class="form-group"><label>Nume serviciu *</label><input type="text" name="nume" placeholder="ex: Schimb anvelope" required></div>
                <div class="form-group"><label>Durată estimată</label><select name="durata_ore"><option value="2">2 ore</option><option value="4">4 ore (zi întreagă)</option></select></div>
                <div class="form-group" style="display:flex;align-items:flex-end;"><button type="submit" class="btn btn-primary" style="width:100%;">Adaugă</button></div>
            </div>
            <div class="form-group" style="margin-bottom:0;"><label>Descriere (opțional)</label><input type="text" name="descriere" placeholder="Descriere scurtă afișată pe site..."></div>
        </form>
    </div>
    <div class="svc-list" id="svc-list">${(servicii ?? []).length === 0 ? `<div class="card" style="text-align:center;color:var(--grey);padding:2rem;">Niciun serviciu adăugat încă.</div>` : rows}</div>
    <div class="alert alert-info" style="font-size:0.85rem;"><strong>Reordonare:</strong> Trage rândurile cu ⠿ pentru a schimba ordinea. Ordinea se salvează automat.</div>
  </div>
  <div class="modal" id="modal-edit"><div class="modal-box"><h3>Editează <span style="color:var(--red)">serviciul</span></h3>
    <form method="POST"><input type="hidden" name="actiune" value="editeaza"><input type="hidden" name="serviciu_id" id="edit-id">
        <div class="form-group"><label>Nume serviciu *</label><input type="text" name="nume" id="edit-nume" required></div>
        <div class="form-group"><label>Descriere</label><input type="text" name="descriere" id="edit-descriere" placeholder="Descriere scurtă..."></div>
        <div class="form-group"><label>Durată estimată</label><select name="durata_ore" id="edit-durata"><option value="2">2 ore</option><option value="4">4 ore (zi întreagă)</option></select></div>
        <div class="form-group"><label style="display:flex;align-items:center;gap:0.5rem;cursor:pointer;"><input type="checkbox" name="activ" id="edit-activ" value="1" style="width:auto;accent-color:var(--red);"> Serviciu activ (vizibil pe site)</label></div>
        <div style="display:flex;gap:1rem;margin-top:0.5rem;"><button type="submit" class="btn btn-primary">Salvează</button><button type="button" class="btn btn-outline" onclick="closeEdit()">Anulează</button></div>
    </form></div></div>`;
  const bodyEnd = `<script>
    function openEdit(id,nume,descr,durata,activ){document.getElementById('edit-id').value=id;document.getElementById('edit-nume').value=nume;document.getElementById('edit-descriere').value=descr;document.getElementById('edit-durata').value=durata;document.getElementById('edit-activ').checked=activ==1;document.getElementById('modal-edit').classList.add('open');}
    function closeEdit(){document.getElementById('modal-edit').classList.remove('open');}
    document.getElementById('modal-edit').addEventListener('click',function(e){if(e.target===this)closeEdit();});
    ${DRAG_SCRIPT('svc-row', '/admin/servicii')}
  </script>`;
  return c.html(page({ title: 'Servicii — Admin APG Garage', user, nav: 'admin', currentPath: '/admin/servicii', headExtra: SVC_STYLE, body, bodyEnd }));
}

function DRAG_SCRIPT(rowClass: string, url: string): string {
  return `(function(){var dragged=null;function rows(){return document.querySelectorAll('.${rowClass}');}
  rows().forEach(function(row){
    row.addEventListener('dragstart',function(){dragged=this;setTimeout(function(){row.classList.add('dragging');},0);});
    row.addEventListener('dragend',function(){this.classList.remove('dragging');rows().forEach(function(r){r.classList.remove('drag-over');r.style.borderTop='';});salveaza();});
    row.addEventListener('dragover',function(e){e.preventDefault();rows().forEach(function(r){r.classList.remove('drag-over');});if(this!==dragged)this.classList.add('drag-over');});
    row.addEventListener('drop',function(e){e.preventDefault();if(this!==dragged){var rs=[].slice.call(rows());var di=rs.indexOf(dragged),ti=rs.indexOf(this);if(di<ti)this.after(dragged);else this.before(dragged);}});
  });
  function salveaza(){var fd=new FormData();fd.append('actiune','reordoneaza');var i=1;rows().forEach(function(r){fd.append('ordine['+r.dataset.id+']',i++);});fetch('${url}',{method:'POST',body:fd});}
  })();`;
}

/* ============================ PRETURI ============================ */
const PRET_STYLE = `<style>
    .adauga-form { background:var(--dark2); border:1px solid var(--border); border-top:4px solid var(--red); padding:1.8rem; margin-bottom:2rem; }
    .adauga-form h3 { font-family:'Barlow Condensed',sans-serif; font-size:1.2rem; font-weight:700; text-transform:uppercase; letter-spacing:1px; margin-bottom:1.2rem; }
    .fg3 { display:grid; grid-template-columns:2fr 1fr 1fr; gap:0 1rem; } .fg2 { display:grid; grid-template-columns:1fr 1fr; gap:0 1rem; }
    @media(max-width:650px){ .fg3,.fg2 { grid-template-columns:1fr; } }
    .cat-section { margin-bottom:2rem; }
    .cat-title { font-family:'Barlow Condensed',sans-serif; font-size:1.1rem; font-weight:700; text-transform:uppercase; letter-spacing:1px; padding:0.6rem 1rem; background:var(--black); border-left:4px solid var(--red); display:flex; justify-content:space-between; align-items:center; margin-bottom:0; }
    .cat-count { font-size:0.72rem; color:var(--grey); letter-spacing:1px; }
    .pret-row { background:var(--dark2); border:1px solid var(--border); border-top:none; padding:0.9rem 1rem; display:grid; grid-template-columns:32px 1fr auto auto auto; gap:0.8rem; align-items:center; cursor:default; }
    .pret-row.inactiv { opacity:0.5; } .pret-row:hover { background:rgba(255,255,255,0.02); }
    .drag-handle { color:#444; cursor:grab; font-size:1.1rem; user-select:none; text-align:center; }
    .dragging { opacity:0.3; }
    .pret-info .pret-nume { font-size:0.92rem; color:var(--white); } .pret-info .pret-meta { font-size:0.78rem; color:var(--grey); margin-top:0.1rem; }
    .pret-val { font-family:'Barlow Condensed',sans-serif; font-size:1rem; font-weight:700; color:var(--red); white-space:nowrap; text-align:right; }
    .pret-actions { display:flex; gap:0.4rem; flex-shrink:0; }
    .pret-actions button { padding:0.25rem 0.6rem; font-family:'Barlow Condensed',sans-serif; font-size:0.75rem; font-weight:700; letter-spacing:1px; text-transform:uppercase; cursor:pointer; border:1px solid; background:none; transition:all 0.15s; }
    .btn-e { border-color:var(--border); color:var(--grey); } .btn-e:hover { border-color:var(--white); color:var(--white); }
    .btn-t-on { border-color:#1e8449; color:#2ecc71; } .btn-t-on:hover { background:#1e8449; color:#fff; }
    .btn-t-off { border-color:#444; color:#666; } .btn-t-off:hover { background:#444; color:#fff; }
    .btn-d { border-color:#333; color:#555; } .btn-d:hover { border-color:var(--red); color:var(--red); }
    @media(max-width:600px){ .pret-row { grid-template-columns:1fr auto; } .drag-handle { display:none; } .pret-val { display:none; } }
    .modal { display:none; position:fixed; inset:0; background:rgba(0,0,0,0.85); z-index:999; align-items:center; justify-content:center; padding:1rem; }
    .modal.open { display:flex; }
    .modal-box { background:var(--dark2); border:1px solid var(--border); padding:1.8rem; width:100%; max-width:520px; }
    .modal-box h3 { font-family:'Barlow Condensed',sans-serif; font-size:1.3rem; font-weight:800; text-transform:uppercase; margin-bottom:1.2rem; }
    .preview-btn { display:inline-block; padding:0.5rem 1.2rem; background:none; border:1px solid var(--border); color:var(--grey); font-family:'Barlow Condensed',sans-serif; font-size:0.85rem; font-weight:700; letter-spacing:1px; text-transform:uppercase; text-decoration:none; transition:all 0.15s; }
    .preview-btn:hover { border-color:var(--red); color:var(--red); }
</style>`;

app.post('/preturi', async (c) => {
  const form = await c.req.formData();
  const actiune = String(form.get('actiune') ?? '');
  let error = '';
  let success = '';
  if (actiune === 'reordoneaza') {
    for (const { id, ordine } of parseOrdine(form)) await c.env.DB.prepare('UPDATE preturi SET ordine=? WHERE id=?').bind(ordine, id).run();
    return c.json({ ok: true });
  }
  if (actiune === 'toggle') {
    await c.env.DB.prepare('UPDATE preturi SET activ = 1 - activ WHERE id=?').bind(parseInt(String(form.get('pret_id') ?? '0'), 10)).run();
    return c.redirect('/admin/preturi');
  }
  if (actiune === 'adauga') {
    const categorie = String(form.get('categorie') ?? '').trim();
    const catNoua = String(form.get('categorie_noua') ?? '').trim();
    const catFinala = catNoua || categorie;
    const nume = String(form.get('nume') ?? '').trim();
    const pret = parseFloat(String(form.get('pret_de_la') ?? '0')) || 0;
    const includePiese = form.get('include_piese') !== null ? 1 : 0;
    const nota = String(form.get('nota') ?? '').trim();
    if (!catFinala || !nume) error = 'Categoria și numele sunt obligatorii.';
    else {
      const row = await c.env.DB.prepare('SELECT MAX(ordine) as m FROM preturi').first<{ m: number }>();
      await c.env.DB.prepare('INSERT INTO preturi (categorie, nume, pret_de_la, include_piese, nota, ordine) VALUES (?, ?, ?, ?, ?, ?)').bind(catFinala, nume, pret, includePiese, nota, (row?.m ?? 0) + 1).run();
      success = 'Prețul a fost adăugat.';
    }
  } else if (actiune === 'editeaza') {
    const id = parseInt(String(form.get('pret_id') ?? '0'), 10);
    const categorie = String(form.get('categorie') ?? '').trim();
    const nume = String(form.get('nume') ?? '').trim();
    const pret = parseFloat(String(form.get('pret_de_la') ?? '0')) || 0;
    const includePiese = form.get('include_piese') !== null ? 1 : 0;
    const nota = String(form.get('nota') ?? '').trim();
    if (!categorie || !nume) error = 'Categoria și numele sunt obligatorii.';
    else {
      await c.env.DB.prepare('UPDATE preturi SET categorie=?, nume=?, pret_de_la=?, include_piese=?, nota=? WHERE id=?').bind(categorie, nume, pret, includePiese, nota, id).run();
      success = 'Prețul a fost actualizat.';
    }
  } else if (actiune === 'sterge') {
    await c.env.DB.prepare('DELETE FROM preturi WHERE id=?').bind(parseInt(String(form.get('pret_id') ?? '0'), 10)).run();
    success = 'Prețul a fost șters.';
  }
  return renderPreturi(c, error, success);
});

app.get('/preturi', async (c) => renderPreturi(c, '', ''));

async function renderPreturi(c: AppContext, error: string, success: string) {
  const user = c.get('user')!;
  const { results: preturi } = await c.env.DB.prepare('SELECT * FROM preturi ORDER BY ordine ASC, id ASC').all<any>();
  const categorii = [...new Set((preturi ?? []).map((p) => p.categorie))];
  const grouped = new Map<string, any[]>();
  for (const p of preturi ?? []) {
    if (!grouped.has(p.categorie)) grouped.set(p.categorie, []);
    grouped.get(p.categorie)!.push(p);
  }

  const catOptions = categorii.map((cat) => `<option value="${esc(cat)}">${esc(cat)}</option>`).join('');
  let sectiuni = '';
  for (const [categorie, randuri] of grouped) {
    const rows = randuri.map((p) => `<div class="pret-row ${p.activ ? '' : 'inactiv'}" data-id="${p.id}" draggable="true">
        <div class="drag-handle" title="Trage pentru reordonare">⠿</div>
        <div class="pret-info"><div class="pret-nume">${esc(p.nume)}</div><div class="pret-meta">${p.activ ? '✓ Vizibil' : '✕ Ascuns'}${p.nota ? ' · ' + esc(p.nota) : ''}</div></div>
        <div class="pret-val">de la ${numberFormat(p.pret_de_la, 0)} lei${p.include_piese ? ' + piese' : ''}</div>
        <div class="pret-actions">
            <button class="btn-e" onclick="openEdit(${p.id}, '${jsAttr(p.categorie)}', '${jsAttr(p.nume)}', ${p.pret_de_la}, ${p.include_piese}, '${jsAttr(p.nota ?? '')}')">Edit</button>
            <form method="POST" style="display:inline;"><input type="hidden" name="actiune" value="toggle"><input type="hidden" name="pret_id" value="${p.id}"><button type="submit" class="${p.activ ? 'btn-t-on' : 'btn-t-off'}">${p.activ ? 'Ascunde' : 'Afișează'}</button></form>
            <form method="POST" style="display:inline;" onsubmit="return confirm('Ștergi acest preț?')"><input type="hidden" name="actiune" value="sterge"><input type="hidden" name="pret_id" value="${p.id}"><button type="submit" class="btn-d">✕</button></form>
        </div>
    </div>`).join('');
    sectiuni += `<div class="cat-section"><div class="cat-title"><span>${esc(categorie)}</span><span class="cat-count">${randuri.length} servicii</span></div>${rows}</div>`;
  }

  const body = `<div class="container">
    <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:1rem;margin-bottom:0.3rem;">
        <div class="page-title">Gestionare <span>prețuri</span></div>
        <a href="/preturi" target="_blank" class="preview-btn">Previzualizează →</a>
    </div>
    <div class="page-subtitle">Adaugă, editează și reordonează prețurile afișate pe site.</div>
    ${success ? `<div class="alert alert-success">${esc(success)}</div>` : ''}
    ${error ? `<div class="alert alert-error">${esc(error)}</div>` : ''}
    <div class="adauga-form"><h3>+ Preț nou</h3>
        <form method="POST"><input type="hidden" name="actiune" value="adauga">
            <div class="fg3">
                <div class="form-group"><label>Categorie *</label><select name="categorie" id="cat-select" onchange="toggleCatNoua(this)">${catOptions}<option value="__noua__">+ Categorie nouă...</option></select></div>
                <div class="form-group"><label>Preț de la (lei)</label><input type="number" name="pret_de_la" value="0" min="0" step="0.01"></div>
                <div class="form-group" style="display:flex;align-items:flex-end;"><label style="display:flex;align-items:center;gap:0.5rem;cursor:pointer;padding-bottom:0.75rem;"><input type="checkbox" name="include_piese" value="1" checked style="width:auto;accent-color:var(--red);"> + piese</label></div>
            </div>
            <div class="form-group" id="cat-noua-wrap" style="display:none;"><label>Nume categorie nouă *</label><input type="text" name="categorie_noua" placeholder="ex: Climatizare"></div>
            <div class="fg2">
                <div class="form-group"><label>Denumire serviciu *</label><input type="text" name="nume" placeholder="ex: Schimb plăcuțe față" required></div>
                <div class="form-group"><label>Notă (opțional)</label><input type="text" name="nota" placeholder="ex: per bucată, manoperă"></div>
            </div>
            <button type="submit" class="btn btn-primary">Adaugă prețul</button>
        </form>
    </div>
    ${sectiuni}
    <div class="alert alert-info" style="font-size:0.85rem;">Trage rândurile cu ⠿ pentru a schimba ordinea. Salvarea e automată.</div>
  </div>
  <div class="modal" id="modal-edit"><div class="modal-box"><h3>Editează <span style="color:var(--red)">prețul</span></h3>
    <form method="POST"><input type="hidden" name="actiune" value="editeaza"><input type="hidden" name="pret_id" id="edit-id">
        <div class="fg2"><div class="form-group"><label>Categorie *</label><input type="text" name="categorie" id="edit-cat" required></div><div class="form-group"><label>Preț de la (lei)</label><input type="number" name="pret_de_la" id="edit-pret" min="0" step="0.01"></div></div>
        <div class="form-group"><label>Denumire serviciu *</label><input type="text" name="nume" id="edit-nume" required></div>
        <div class="form-group"><label>Notă</label><input type="text" name="nota" id="edit-nota" placeholder="ex: per bucată, manoperă"></div>
        <div class="form-group"><label style="display:flex;align-items:center;gap:0.5rem;cursor:pointer;"><input type="checkbox" name="include_piese" id="edit-piese" value="1" style="width:auto;accent-color:var(--red);"> Prețul nu include piesele (afișează + piese)</label></div>
        <div style="display:flex;gap:1rem;margin-top:0.5rem;"><button type="submit" class="btn btn-primary">Salvează</button><button type="button" class="btn btn-outline" onclick="closeEdit()">Anulează</button></div>
    </form></div></div>`;
  const bodyEnd = `<script>
    function toggleCatNoua(sel){document.getElementById('cat-noua-wrap').style.display=sel.value==='__noua__'?'block':'none';}
    function openEdit(id,cat,nume,pret,piese,nota){document.getElementById('edit-id').value=id;document.getElementById('edit-cat').value=cat;document.getElementById('edit-nume').value=nume;document.getElementById('edit-pret').value=pret;document.getElementById('edit-nota').value=nota;document.getElementById('edit-piese').checked=piese==1;document.getElementById('modal-edit').classList.add('open');}
    function closeEdit(){document.getElementById('modal-edit').classList.remove('open');}
    document.getElementById('modal-edit').addEventListener('click',function(e){if(e.target===this)closeEdit();});
    ${DRAG_SCRIPT('pret-row', '/admin/preturi')}
  </script>`;
  return c.html(page({ title: 'Prețuri — Admin APG Garage', user, nav: 'admin', currentPath: '/admin/preturi', headExtra: PRET_STYLE, body, bodyEnd }));
}

export default app;
