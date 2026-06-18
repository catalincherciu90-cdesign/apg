import { Hono } from 'hono';
import type { Env, Variables } from '../../types';
import { page } from '../../views/layout';
import { esc, numberFormat, dateRo, timeShort, serviciuLabel } from '../../lib/format';
import { parseRanduri } from '../../lib/form';
import { notificareDevizNou } from '../../lib/notificari';
import { ensureDevizDecizie } from '../../lib/deviz';
import { CATALOG_PIESE, CATALOG_MANOPERA } from '../../data/catalog';

const app = new Hono<{ Bindings: Env; Variables: Variables }>();

const DEVIZ_STYLE = `<style>
    .info-bar { background:var(--black); border:1px solid var(--border); border-left:4px solid var(--red); padding:1rem 1.5rem; margin-bottom:2rem; display:flex; flex-wrap:wrap; gap:1.5rem; }
    .info-bar .info-item { display:flex; flex-direction:column; gap:0.1rem; }
    .info-bar .info-item .lbl { font-size:0.7rem; font-weight:700; letter-spacing:1.5px; text-transform:uppercase; color:var(--grey); }
    .info-bar .info-item .val { font-size:0.95rem; color:var(--white); }
    .deviz-section { margin-bottom:2rem; }
    .deviz-section-title { font-family:'Barlow Condensed',sans-serif; font-size:1.1rem; font-weight:700; text-transform:uppercase; letter-spacing:1px; padding:0.6rem 1rem; background:var(--black); border-left:4px solid var(--red); margin-bottom:0; }
    .rand-row { display:grid; grid-template-columns:2fr 1fr 1fr 1fr auto; gap:0.5rem; align-items:center; padding:0.6rem 1rem; border-bottom:1px solid var(--border); background:var(--dark2); }
    .rand-row:hover { background:rgba(255,255,255,0.02); }
    .rand-row input, .rand-row select { background:var(--black); border:1px solid var(--border); color:var(--white); padding:0.4rem 0.6rem; font-family:'Barlow',sans-serif; font-size:0.88rem; width:100%; outline:none; }
    .rand-row input:focus, .rand-row select:focus { border-color:var(--red); }
    .rand-row .total-cell { font-family:'Barlow Condensed',sans-serif; font-size:1rem; font-weight:700; color:var(--red); text-align:right; white-space:nowrap; }
    .rand-row .del-btn { background:none; border:1px solid #333; color:#555; width:28px; height:28px; cursor:pointer; font-size:1rem; display:flex; align-items:center; justify-content:center; transition:all 0.15s; flex-shrink:0; }
    .rand-row .del-btn:hover { border-color:var(--red); color:var(--red); }
    .rand-header { display:grid; grid-template-columns:2fr 1fr 1fr 1fr auto; gap:0.5rem; padding:0.5rem 1rem; background:var(--black); border-bottom:1px solid var(--border); }
    .rand-header span { font-size:0.7rem; font-weight:700; letter-spacing:1.5px; text-transform:uppercase; color:var(--grey); }
    .add-btn { display:block; width:100%; padding:0.7rem; background:none; border:1px dashed var(--border); color:var(--grey); font-family:'Barlow Condensed',sans-serif; font-size:0.9rem; font-weight:600; letter-spacing:1px; text-transform:uppercase; cursor:pointer; transition:all 0.15s; }
    .add-btn:hover { border-color:var(--red); color:var(--red); }
    .total-bar { background:var(--black); border:1px solid var(--border); border-top:2px solid var(--red); padding:1.2rem 1.5rem; display:flex; justify-content:flex-end; align-items:center; gap:1rem; margin-bottom:2rem; }
    .total-bar .total-label { color:var(--grey); font-size:0.9rem; text-transform:uppercase; letter-spacing:1px; }
    .total-bar .total-val { font-family:'Barlow Condensed',sans-serif; font-size:2rem; font-weight:800; color:var(--red); }
    .action-bar { display:flex; gap:1rem; flex-wrap:wrap; margin-bottom:2rem; }
    .status-badge-deviz { display:inline-block; padding:0.3rem 0.8rem; font-size:0.75rem; font-weight:700; letter-spacing:1px; text-transform:uppercase; }
    .status-draft { background:#2a2a00; color:#f0a500; } .status-trimis { background:#0b2c13; color:#2ecc71; }
    @media (max-width:650px) { .rand-header { display:none; } .rand-row { grid-template-columns:1fr 1fr; grid-template-rows:auto auto auto; gap:0.4rem; padding:0.8rem; } .rand-row .nume-col { grid-column:1/-1; } .rand-row .total-cell { text-align:left; } .info-bar { flex-direction:column; gap:0.8rem; } }
</style>`;

const FIELD_STYLE = `width:100%;background:var(--black);border:1px solid var(--border);color:var(--white);padding:0.4rem 0.6rem;font-family:'Barlow',sans-serif;font-size:0.88rem;outline:none;`;

async function getOrCreateDeviz(env: Env, rezervareId: number) {
  let deviz = await env.DB.prepare('SELECT * FROM devize WHERE rezervare_id = ?').bind(rezervareId).first<any>();
  if (!deviz) {
    await env.DB.prepare('INSERT INTO devize (rezervare_id) VALUES (?)').bind(rezervareId).run();
    deviz = await env.DB.prepare('SELECT * FROM devize WHERE rezervare_id = ?').bind(rezervareId).first<any>();
  }
  return deviz;
}

app.post('/deviz', async (c) => {
  const rezervareId = parseInt(c.req.query('rezervare_id') ?? '0', 10);
  if (!rezervareId) return c.redirect('/admin');
  const rezervare = await c.env.DB.prepare('SELECT r.*, u.nume as client_nume, u.email as client_email FROM rezervari r JOIN users u ON u.id = r.user_id WHERE r.id = ?').bind(rezervareId).first<any>();
  if (!rezervare) return c.redirect('/admin');
  const deviz = await getOrCreateDeviz(c.env, rezervareId);
  const form = await c.req.formData();
  const actiune = String(form.get('actiune') ?? '');

  if (actiune === 'salveaza') {
    await c.env.DB.prepare('DELETE FROM deviz_randuri WHERE deviz_id = ?').bind(deviz.id).run();
    for (const rand of parseRanduri(form)) {
      const nume = (rand.nume ?? '').trim();
      if (!nume) continue;
      const tip = rand.tip ?? 'piesa';
      const categorie = (rand.categorie ?? '').trim();
      const cantitate = parseFloat(rand.cantitate ?? '1') || 0;
      const pret = parseFloat(rand.pret_unitar ?? '0') || 0;
      await c.env.DB.prepare('INSERT INTO deviz_randuri (deviz_id, tip, categorie, nume, cantitate, pret_unitar, total) VALUES (?, ?, ?, ?, ?, ?, ?)')
        .bind(deviz.id, tip, categorie, nume, cantitate, pret, cantitate * pret).run();
    }
    const obs = String(form.get('observatii') ?? '').trim();
    await c.env.DB.prepare(`UPDATE devize SET observatii = ?, status = 'draft', updated_at = datetime('now') WHERE id = ?`).bind(obs, deviz.id).run();
  } else if (actiune === 'trimite') {
    await c.env.DB.prepare(`UPDATE devize SET status = 'trimis', updated_at = datetime('now') WHERE id = ?`).bind(deviz.id).run();
    const row = await c.env.DB.prepare('SELECT SUM(total) as total FROM deviz_randuri WHERE deviz_id = ?').bind(deviz.id).first<{ total: number }>();
    const total = row?.total ?? 0;
    c.executionCtx.waitUntil(notificareDevizNou(c.env, rezervare.client_email, rezervare.nr_inmatriculare ?? '-', rezervareId, total));
  }
  return c.redirect('/admin/deviz?rezervare_id=' + rezervareId + '&saved=1');
});

app.get('/deviz', async (c) => {
  const user = c.get('user')!;
  const rezervareId = parseInt(c.req.query('rezervare_id') ?? '0', 10);
  if (!rezervareId) return c.redirect('/admin');
  const rezervare = await c.env.DB.prepare('SELECT r.*, u.nume as client_nume, u.email as client_email, u.telefon as client_telefon FROM rezervari r JOIN users u ON u.id = r.user_id WHERE r.id = ?').bind(rezervareId).first<any>();
  if (!rezervare) return c.redirect('/admin');
  await ensureDevizDecizie(c.env);
  const deviz = await getOrCreateDeviz(c.env, rezervareId);
  const { results: randuri } = await c.env.DB.prepare('SELECT * FROM deviz_randuri WHERE deviz_id = ? ORDER BY tip, categorie, id').bind(deviz.id).all<any>();
  const totalGeneral = (randuri ?? []).reduce((s, r) => s + Number(r.total), 0);
  const saved = c.req.query('saved') !== undefined;

  const pieseRows = (randuri ?? []).filter((r) => r.tip === 'piesa').map((rand, i) => `<div class="rand-row">
        <div class="nume-col"><input type="text" name="randuri[p${i}][nume]" value="${esc(rand.nume)}" placeholder="Denumire piesă" required></div>
        <input type="hidden" name="randuri[p${i}][tip]" value="piesa">
        <input type="text" name="randuri[p${i}][categorie]" value="${esc(rand.categorie ?? '')}" placeholder="Categorie">
        <input type="number" name="randuri[p${i}][cantitate]" value="${rand.cantitate}" min="0.1" step="0.1" class="qty-input">
        <input type="number" name="randuri[p${i}][pret_unitar]" value="${rand.pret_unitar}" min="0" step="0.01" placeholder="0.00" class="pret-input">
        <span class="total-cell">${numberFormat(rand.total, 2)} lei</span>
        <button type="button" class="del-btn" onclick="this.closest('.rand-row').remove(); recalcTotal()">×</button>
    </div>`).join('');

  const manoperaRows = (randuri ?? []).filter((r) => r.tip === 'manopera').map((rand, i) => `<div class="rand-row">
        <div class="nume-col" style="grid-column:1/3;"><input type="text" name="randuri[m${i}][nume]" value="${esc(rand.nume)}" placeholder="Denumire manoperă" required></div>
        <input type="hidden" name="randuri[m${i}][tip]" value="manopera">
        <input type="hidden" name="randuri[m${i}][categorie]" value="manopera">
        <input type="number" name="randuri[m${i}][cantitate]" value="${rand.cantitate}" min="0.1" step="0.1" class="qty-input">
        <input type="number" name="randuri[m${i}][pret_unitar]" value="${rand.pret_unitar}" min="0" step="0.01" placeholder="0.00" class="pret-input">
        <span class="total-cell">${numberFormat(rand.total, 2)} lei</span>
        <button type="button" class="del-btn" onclick="this.closest('.rand-row').remove(); recalcTotal()">×</button>
    </div>`).join('');

  const pieseOptions = Object.entries(CATALOG_PIESE).map(([cat, piese]) =>
    `<optgroup label="${esc(cat)}">${piese.map((p) => `<option value="${esc(p)}" data-cat="${esc(cat)}">${esc(p)}</option>`).join('')}</optgroup>`,
  ).join('');
  const manoperaOptions = CATALOG_MANOPERA.map((m) => `<option value="${esc(m)}">${esc(m)}</option>`).join('');

  const trimiteBtn = deviz.status === 'draft'
    ? `<button type="submit" name="actiune" value="trimite" class="btn btn-primary" onclick="return confirm('Trimiți devizul la client?')">Trimite la client</button>`
    : `<button type="submit" name="actiune" value="salveaza" class="btn btn-primary">Actualizează deviz</button>`;

  const body = `<div class="container">
    <div style="display:flex;align-items:center;gap:1rem;margin-bottom:0.3rem;flex-wrap:wrap;">
        <div class="page-title">Deviz <span>#${deviz.id}</span></div>
        <span class="status-badge-deviz status-${deviz.status}">${deviz.status === 'trimis' ? 'Trimis la client' : 'Draft'}</span>
        ${deviz.decizie ? `<span class="status-badge-deviz" style="background:${deviz.decizie === 'aprobat' ? '#0b2c13' : '#2c0b0b'};color:${deviz.decizie === 'aprobat' ? '#2ecc71' : '#e74c3c'};">Client: ${deviz.decizie === 'aprobat' ? '✓ APROBAT' : '✕ RESPINS'}</span>` : ''}
    </div>
    <div class="page-subtitle"><a href="/admin" style="color:var(--red);text-decoration:none;">← Înapoi la programări</a></div>
    ${saved ? `<div class="alert alert-success">Devizul a fost salvat.</div>` : ''}
    <div class="info-bar">
        <div class="info-item"><span class="lbl">Client</span><span class="val">${esc(rezervare.client_nume)}</span></div>
        <div class="info-item"><span class="lbl">Telefon</span><span class="val">${esc(rezervare.client_telefon ?? '')}</span></div>
        <div class="info-item"><span class="lbl">Mașina</span><span class="val">${esc(rezervare.nr_inmatriculare ?? '-')} — ${esc((rezervare.producator ?? '') + ' ' + (rezervare.model ?? ''))}</span></div>
        <div class="info-item"><span class="lbl">Data</span><span class="val">${dateRo(rezervare.data)} ora ${timeShort(rezervare.ora_start)}</span></div>
        <div class="info-item"><span class="lbl">Serviciu</span><span class="val">${serviciuLabel(rezervare.serviciu_tip)}</span></div>
    </div>
    <form method="POST" id="deviz-form">
        <div class="deviz-section">
            <div class="deviz-section-title">🔧 Piese</div>
            <div class="rand-header"><span>Piesă</span><span>Categorie</span><span>Cantitate</span><span>Preț unitar (lei)</span><span></span></div>
            <div id="lista-piese">${pieseRows}</div>
            <button type="button" class="add-btn" onclick="adaugaPiesa()">+ Adaugă piesă</button>
        </div>
        <div class="deviz-section">
            <div class="deviz-section-title">⚙️ Manoperă</div>
            <div class="rand-header"><span>Serviciu</span><span></span><span>Ore / buc</span><span>Preț (lei)</span><span></span></div>
            <div id="lista-manopera">${manoperaRows}</div>
            <button type="button" class="add-btn" onclick="adaugaManopera()">+ Adaugă manoperă</button>
        </div>
        <div class="form-group"><label>Observații</label><textarea name="observatii" rows="3" placeholder="Observații suplimentare pentru client...">${esc(deviz.observatii ?? '')}</textarea></div>
        <div class="total-bar"><span class="total-label">Total deviz</span><span class="total-val" id="total-display">${numberFormat(totalGeneral, 2)} lei</span></div>
        <div class="action-bar">
            <button type="submit" name="actiune" value="salveaza" class="btn btn-outline">Salvează draft</button>
            ${trimiteBtn}
            <a href="/admin" class="btn btn-outline">Anulează</a>
        </div>
    </form>
  </div>
  <template id="tpl-piesa"><div class="rand-row">
    <div class="nume-col">
        <select class="piesa-select" style="${FIELD_STYLE}"><option value="">Alege din catalog sau scrie manual...</option>${pieseOptions}<option value="__custom__">✏️ Scrie manual...</option></select>
        <input type="text" class="piesa-input" placeholder="Denumire piesă" style="display:none;${FIELD_STYLE}">
    </div>
    <input type="hidden" class="tip-hidden" value="piesa"><input type="hidden" class="cat-hidden">
    <input type="number" class="qty-input" placeholder="1" value="1" min="0.1" step="0.1">
    <input type="number" class="pret-input" placeholder="0.00" min="0" step="0.01">
    <span class="total-cell">0.00 lei</span>
    <button type="button" class="del-btn" onclick="this.closest('.rand-row').remove(); recalcTotal()">×</button>
  </div></template>
  <template id="tpl-manopera"><div class="rand-row">
    <div class="nume-col" style="grid-column:1/3;">
        <select class="manopera-select" style="${FIELD_STYLE}"><option value="">Alege sau scrie manual...</option>${manoperaOptions}<option value="__custom__">✏️ Scrie manual...</option></select>
        <input type="text" class="manopera-input" placeholder="Denumire manoperă" style="display:none;${FIELD_STYLE}">
    </div>
    <input type="hidden" class="tip-hidden" value="manopera"><input type="hidden" class="cat-hidden" value="manopera">
    <input type="number" class="qty-input" placeholder="1" value="1" min="0.1" step="0.1">
    <input type="number" class="pret-input" placeholder="0.00" min="0" step="0.01">
    <span class="total-cell">0.00 lei</span>
    <button type="button" class="del-btn" onclick="this.closest('.rand-row').remove(); recalcTotal()">×</button>
  </div></template>`;

  const bodyEnd = `<script>
  let randCounter = ${(randuri ?? []).length + 100};
  function bindRow(row, prefix){
    const idx = randCounter++;
    const sel = row.querySelector(prefix==='piesa'?'.piesa-select':'.manopera-select');
    const inp = row.querySelector(prefix==='piesa'?'.piesa-input':'.manopera-input');
    const cat = row.querySelector('.cat-hidden'), tip = row.querySelector('.tip-hidden');
    const qty = row.querySelector('.qty-input'), pret = row.querySelector('.pret-input');
    tip.name='randuri[n'+idx+'][tip]'; cat.name='randuri[n'+idx+'][categorie]'; qty.name='randuri[n'+idx+'][cantitate]'; pret.name='randuri[n'+idx+'][pret_unitar]';
    sel.addEventListener('change',function(){
      if(this.value==='__custom__'){inp.style.display='block';inp.name='randuri[n'+idx+'][nume]';inp.required=true;sel.style.display='none';sel.removeAttribute('name');inp.focus();}
      else if(this.value){var opt=this.options[this.selectedIndex];if(prefix==='piesa')cat.value=opt.dataset.cat||'';inp.style.display='none';sel.name='randuri[n'+idx+'][nume]';}
    });
    qty.addEventListener('input',function(){updateTotal(row);});
    pret.addEventListener('input',function(){updateTotal(row);});
  }
  function adaugaPiesa(){var row=document.getElementById('tpl-piesa').content.cloneNode(true).querySelector('.rand-row');bindRow(row,'piesa');document.getElementById('lista-piese').appendChild(row);}
  function adaugaManopera(){var row=document.getElementById('tpl-manopera').content.cloneNode(true).querySelector('.rand-row');bindRow(row,'manopera');document.getElementById('lista-manopera').appendChild(row);}
  function updateTotal(row){var qty=parseFloat(row.querySelector('.qty-input').value)||0;var pret=parseFloat(row.querySelector('.pret-input').value)||0;row.querySelector('.total-cell').textContent=(qty*pret).toFixed(2)+' lei';recalcTotal();}
  function recalcTotal(){var total=0;document.querySelectorAll('.total-cell').forEach(function(el){total+=parseFloat(el.textContent)||0;});document.getElementById('total-display').textContent=total.toFixed(2)+' lei';}
  document.querySelectorAll('#lista-piese .rand-row, #lista-manopera .rand-row').forEach(function(row){var qty=row.querySelector('.qty-input');var pret=row.querySelector('.pret-input');if(qty)qty.addEventListener('input',function(){updateTotal(row);});if(pret)pret.addEventListener('input',function(){updateTotal(row);});});
  </script>`;
  return c.html(page({ title: 'Deviz — APG Garage', user, nav: 'admin', currentPath: '/admin', headExtra: DEVIZ_STYLE, body, bodyEnd }));
});

export default app;
