import { Hono } from 'hono';
import type { Env, Variables, SessionUser, AppContext } from '../../types';
import { page } from '../../views/layout';
import { esc } from '../../lib/format';
import { hashPassword } from '../../lib/password';
import { getAll } from '../../lib/form';
import { LABELS, SECTIUNI } from '../../lib/permisiuni';
import { getSetari, setSetare } from '../../lib/setari';
import { createSessionCookie } from '../../lib/session';

const app = new Hono<{ Bindings: Env; Variables: Variables }>();
const jsAttr = (s: string) => esc(s).replace(/'/g, '&#039;');

/* ============================ ANGAJATI ============================ */
const ANG_STYLE = `<style>
    .angajat-card { background: var(--dark2); border: 1px solid var(--border); border-left: 4px solid var(--border); padding: 1.5rem; margin-bottom: 1.2rem; }
    .angajat-card.activ { border-left-color: #2ecc71; } .angajat-card.inactiv { border-left-color: #444; opacity: 0.7; }
    .angajat-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 1rem; margin-bottom: 1rem; flex-wrap: wrap; }
    .angajat-info h3 { font-family: 'Barlow Condensed', sans-serif; font-size: 1.2rem; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 0.2rem; }
    .angajat-info .meta { color: var(--grey); font-size: 0.85rem; }
    .perm-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 0.5rem; margin-bottom: 1rem; }
    .perm-item { display: flex; align-items: center; gap: 0.6rem; background: var(--black); border: 1px solid var(--border); padding: 0.5rem 0.8rem; font-size: 0.85rem; cursor: pointer; transition: border-color 0.15s; user-select: none; }
    .perm-item:hover { border-color: var(--red); } .perm-item.on { border-color: #2ecc71; background: rgba(46,204,113,0.06); }
    .perm-item input { width: auto; accent-color: #2ecc71; }
    .angajat-actions { display: flex; gap: 0.5rem; flex-wrap: wrap; padding-top: 1rem; border-top: 1px solid var(--border); margin-top: 1rem; }
    .angajat-actions button { padding: 0.4rem 0.9rem; font-family: 'Barlow Condensed', sans-serif; font-size: 0.82rem; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; cursor: pointer; border: 1px solid; background: none; transition: all 0.15s; }
    .btn-save-perm { border-color: #1e8449; color: #2ecc71; } .btn-save-perm:hover { background: #1e8449; color: #fff; }
    .btn-reset-pass { border-color: var(--border); color: var(--grey); } .btn-reset-pass:hover { border-color: var(--white); color: var(--white); }
    .btn-toggle-acc { border-color: #1a6a9a; color: #3498db; } .btn-toggle-acc:hover { background: #1a6a9a; color: #fff; } .btn-toggle-acc.off { border-color: #333; color: #555; }
    .btn-del-ang { border-color: #333; color: #555; } .btn-del-ang:hover { border-color: var(--red); color: var(--red); }
    .adauga-form { background: var(--dark2); border: 1px solid var(--border); border-top: 4px solid var(--red); padding: 1.8rem; margin-bottom: 2rem; }
    .adauga-form h3 { font-family: 'Barlow Condensed', sans-serif; font-size: 1.2rem; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 1.2rem; }
    .fg2 { display: grid; grid-template-columns: 1fr 1fr; gap: 0 1rem; }
    @media (max-width: 600px) { .fg2 { grid-template-columns: 1fr; } .perm-grid { grid-template-columns: 1fr; } }
    .modal { display:none; position:fixed; inset:0; background:rgba(0,0,0,0.85); z-index:999; align-items:center; justify-content:center; padding:1rem; }
    .modal.open { display:flex; }
    .modal-box { background:var(--dark2); border:1px solid var(--border); padding:1.8rem; width:100%; max-width:420px; }
    .modal-box h3 { font-family:'Barlow Condensed',sans-serif; font-size:1.3rem; font-weight:800; text-transform:uppercase; margin-bottom:1rem; }
</style>`;

app.post('/angajati', async (c) => {
  const user = c.get('user')!;
  const form = await c.req.formData();
  const actiune = String(form.get('actiune') ?? '');
  let error = '';
  let success = '';

  if (actiune === 'adauga') {
    const nume = String(form.get('nume') ?? '').trim();
    const email = String(form.get('email') ?? '').trim();
    const telefon = String(form.get('telefon') ?? '').trim();
    const parola = String(form.get('parola') ?? '');
    const perm = getAll(form, 'permisiuni[]');
    const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    if (!nume || !email || !parola) error = 'Completează numele, emailul și parola.';
    else if (!emailValid) error = 'Adresa de email nu este validă.';
    else if (parola.length < 6) error = 'Parola trebuie să aibă minim 6 caractere.';
    else {
      const exists = await c.env.DB.prepare('SELECT id FROM users WHERE email = ?').bind(email).first();
      if (exists) error = 'Există deja un cont cu această adresă de email.';
      else {
        const hash = await hashPassword(parola);
        await c.env.DB.prepare(`INSERT INTO users (nume, email, parola, telefon, rol, permisiuni) VALUES (?, ?, ?, ?, 'angajat', ?)`).bind(nume, email, hash, telefon, JSON.stringify(perm)).run();
        success = 'Contul de angajat a fost creat.';
      }
    }
  } else if (actiune === 'permisiuni') {
    const userId = parseInt(String(form.get('user_id') ?? '0'), 10);
    const perm = getAll(form, 'permisiuni[]');
    await c.env.DB.prepare(`UPDATE users SET permisiuni = ? WHERE id = ? AND rol = 'angajat'`).bind(JSON.stringify(perm), userId).run();
    success = 'Permisiunile au fost actualizate.';
    if (userId === user.uid) {
      const updated: SessionUser = { ...user, perms: perm };
      await createSessionCookie(c, updated);
      c.set('user', updated);
    }
  } else if (actiune === 'reset_parola') {
    const userId = parseInt(String(form.get('user_id') ?? '0'), 10);
    const parola = String(form.get('parola_noua') ?? '');
    if (parola.length < 6) error = 'Parola trebuie să aibă minim 6 caractere.';
    else {
      const hash = await hashPassword(parola);
      await c.env.DB.prepare(`UPDATE users SET parola = ? WHERE id = ? AND rol = 'angajat'`).bind(hash, userId).run();
      success = 'Parola a fost resetată.';
    }
  } else if (actiune === 'toggle_cont') {
    const userId = parseInt(String(form.get('user_id') ?? '0'), 10);
    const row = await c.env.DB.prepare('SELECT permisiuni FROM users WHERE id = ?').bind(userId).first<{ permisiuni: string }>();
    let perm: string[] = [];
    try { const d = JSON.parse(row?.permisiuni ?? '[]'); if (Array.isArray(d)) perm = d; } catch { /* ignore */ }
    if (perm.length === 0) {
      await c.env.DB.prepare('UPDATE users SET permisiuni = ? WHERE id = ?').bind(JSON.stringify(['programari']), userId).run();
      success = 'Contul a fost activat.';
    } else {
      await c.env.DB.prepare(`UPDATE users SET permisiuni = '[]' WHERE id = ?`).bind(userId).run();
      success = 'Contul a fost dezactivat.';
    }
  } else if (actiune === 'sterge') {
    const userId = parseInt(String(form.get('user_id') ?? '0'), 10);
    if (userId === user.uid) error = 'Nu îți poți șterge propriul cont.';
    else {
      await c.env.DB.prepare(`DELETE FROM users WHERE id = ? AND rol = 'angajat'`).bind(userId).run();
      success = 'Contul a fost șters.';
    }
  }
  return renderAngajati(c, error, success);
});

app.get('/angajati', async (c) => renderAngajati(c, '', ''));

async function renderAngajati(c: AppContext, error: string, success: string) {
  const user = c.get('user')!;
  const { results: angajati } = await c.env.DB.prepare(`SELECT id, nume, email, telefon, permisiuni, created_at FROM users WHERE rol = 'angajat' ORDER BY created_at DESC`).all<any>();
  const sectiuni = Object.entries(LABELS);

  const permGridNou = sectiuni.map(([key, label]) =>
    `<label class="perm-item"><input type="checkbox" name="permisiuni[]" value="${key}"> ${label}</label>`,
  ).join('');

  const carduri = (angajati ?? []).map((a) => {
    let permUser: string[] = [];
    try { const d = JSON.parse(a.permisiuni ?? '[]'); if (Array.isArray(d)) permUser = d; } catch { /* ignore */ }
    const activ = permUser.length > 0;
    const isSuper = SECTIUNI.every((s) => permUser.includes(s));
    const permGrid = sectiuni.map(([key, label]) => {
      const on = permUser.includes(key);
      return `<label class="perm-item ${on ? 'on' : ''}"><input type="checkbox" name="permisiuni[]" value="${key}" ${on ? 'checked' : ''}> ${label}</label>`;
    }).join('');
    const dataRo = String(a.created_at).slice(0, 10).split('-').reverse().join('.');
    return `<div class="angajat-card ${activ ? 'activ' : 'inactiv'}">
      <div class="angajat-header">
        <div class="angajat-info"><h3>${esc(a.nume)}${isSuper ? ` <span style="font-size:0.7rem;color:#f0a500;background:#2a2000;padding:0.1rem 0.5rem;letter-spacing:1px;vertical-align:middle;">SUPERADMIN</span>` : ''}</h3>
            <div class="meta">${esc(a.email)}${a.telefon ? ' · ' + esc(a.telefon) : ''} · Creat: ${dataRo}</div>
        </div>
        <span class="badge ${activ ? 'badge-confirmat' : 'badge-respins'}">${activ ? 'Activ' : 'Dezactivat'}</span>
      </div>
      <form method="POST"><input type="hidden" name="actiune" value="permisiuni"><input type="hidden" name="user_id" value="${a.id}">
        <div class="form-group" style="margin-bottom:0.8rem;"><label style="margin-bottom:0.5rem;">Acces la secțiuni</label><div class="perm-grid">${permGrid}</div></div>
        <div class="angajat-actions">
            <button type="submit" class="btn-save-perm">✓ Salvează permisiunile</button>
            <button type="button" class="btn-reset-pass" onclick="openResetPass(${a.id}, '${jsAttr(a.nume)}')">Resetează parola</button>
            <button type="button" class="btn-toggle-acc ${activ ? '' : 'off'}" onclick="submitToggle(${a.id})">${activ ? 'Dezactivează' : 'Activează'}</button>
            ${a.id !== user.uid ? `<button type="button" class="btn-del-ang" onclick="submitSterge(${a.id}, '${jsAttr(a.nume)}')">Șterge</button>` : ''}
        </div>
      </form>
    </div>`;
  }).join('');

  const body = `<div class="container">
    <div class="page-title">Gestionare <span>angajați</span></div>
    <div class="page-subtitle">Creează conturi și setează accesul fiecărui angajat.</div>
    ${success ? `<div class="alert alert-success">${esc(success)}</div>` : ''}
    ${error ? `<div class="alert alert-error">${esc(error)}</div>` : ''}
    <div class="adauga-form"><h3>+ Angajat nou</h3>
        <form method="POST"><input type="hidden" name="actiune" value="adauga">
            <div class="fg2">
                <div class="form-group"><label>Nume complet *</label><input type="text" name="nume" placeholder="ex: Ion Popescu" required></div>
                <div class="form-group"><label>Email *</label><input type="email" name="email" placeholder="angajat@apg-garage.ro" required></div>
                <div class="form-group"><label>Telefon</label><input type="tel" name="telefon" placeholder="07xx xxx xxx"></div>
                <div class="form-group"><label>Parolă * (minim 6 caractere)</label><input type="password" name="parola" required></div>
            </div>
            <div class="form-group"><label style="margin-bottom:0.6rem;">Acces la secțiuni</label><div class="perm-grid" id="perm-grid-nou">${permGridNou}</div></div>
            <button type="submit" class="btn btn-primary">Creează contul</button>
        </form>
    </div>
    ${(angajati ?? []).length === 0 ? `<div class="card" style="text-align:center;color:var(--grey);padding:2rem;">Niciun angajat adăugat încă.</div>` : carduri}
  </div>
  <div class="modal" id="modal-parola"><div class="modal-box"><h3>Resetează <span style="color:var(--red)">parola</span></h3>
    <p style="color:var(--grey);font-size:0.88rem;margin-bottom:1rem;" id="modal-parola-nume"></p>
    <form method="POST"><input type="hidden" name="actiune" value="reset_parola"><input type="hidden" name="user_id" id="modal-parola-id">
        <div class="form-group"><label>Parolă nouă * (minim 6 caractere)</label><input type="password" name="parola_noua" required minlength="6"></div>
        <div style="display:flex;gap:1rem;margin-top:0.5rem;"><button type="submit" class="btn btn-primary">Salvează</button><button type="button" class="btn btn-outline" onclick="closeModal('modal-parola')">Anulează</button></div>
    </form></div></div>
  <form method="POST" id="form-toggle" style="display:none;"><input type="hidden" name="actiune" value="toggle_cont"><input type="hidden" name="user_id" id="toggle-id"></form>
  <form method="POST" id="form-sterge" style="display:none;"><input type="hidden" name="actiune" value="sterge"><input type="hidden" name="user_id" id="sterge-id"></form>`;
  const bodyEnd = `<script>
    function openResetPass(id,nume){document.getElementById('modal-parola-id').value=id;document.getElementById('modal-parola-nume').textContent='Angajat: '+nume;document.getElementById('modal-parola').classList.add('open');}
    function closeModal(id){document.getElementById(id).classList.remove('open');}
    document.getElementById('modal-parola').addEventListener('click',function(e){if(e.target===this)closeModal('modal-parola');});
    function submitToggle(id){document.getElementById('toggle-id').value=id;document.getElementById('form-toggle').submit();}
    function submitSterge(id,nume){if(confirm('Ștergi contul lui '+nume+'? Această acțiune nu poate fi anulată.')){document.getElementById('sterge-id').value=id;document.getElementById('form-sterge').submit();}}
    document.querySelectorAll('.perm-item input').forEach(function(cb){cb.addEventListener('change',function(){this.closest('.perm-item').classList.toggle('on',this.checked);});});
  </script>`;
  return c.html(page({ title: 'Angajați — Admin APG Garage', user, nav: 'admin', currentPath: '/admin/angajati', headExtra: ANG_STYLE, body, bodyEnd }));
}

/* ============================ DATE CONTACT ============================ */
const CONTACT_KEYS = ['contact_adresa', 'contact_telefon', 'contact_email', 'contact_program_sapt', 'contact_program_ore', 'contact_maps_url'];

app.post('/contact', async (c) => {
  const form = await c.req.formData();
  for (const cheie of CONTACT_KEYS) {
    if (form.get(cheie) !== null) await setSetare(c.env, cheie, String(form.get(cheie)).trim());
  }
  return renderContact(c, 'Datele de contact au fost salvate.');
});

app.get('/contact', async (c) => renderContact(c, ''));

async function renderContact(c: AppContext, success: string) {
  const user = c.get('user')!;
  const s = await getSetari(c.env);
  const labelStyle = 'font-size:0.7rem;font-weight:700;letter-spacing:3px;text-transform:uppercase;color:var(--red);margin-bottom:1rem;padding-bottom:0.4rem;border-bottom:1px solid var(--border);';
  const harta = s.contact_maps_url
    ? `<iframe src="${esc(s.contact_maps_url)}" width="100%" height="200" style="border:0;" allowfullscreen="" loading="lazy"></iframe>`
    : `<div class="maps-preview" id="maps-placeholder">🗺️ Harta va apărea aici după ce introduci URL-ul</div>`;
  const headExtra = `<style>
    .preview-btn { display:inline-block; padding:0.5rem 1.2rem; background:none; border:1px solid var(--border); color:var(--grey); font-family:'Barlow Condensed',sans-serif; font-size:0.85rem; font-weight:700; letter-spacing:1px; text-transform:uppercase; text-decoration:none; transition:all 0.15s; }
    .preview-btn:hover { border-color:var(--red); color:var(--red); }
    .fg2 { display:grid; grid-template-columns:1fr 1fr; gap:0 1.5rem; } @media(max-width:600px){ .fg2 { grid-template-columns:1fr; } }
    .hint { font-size:0.75rem; color:#555; margin-top:0.25rem; }
    .maps-preview { width:100%; height:200px; background:var(--black); border:1px solid var(--border); margin-top:0.5rem; display:flex; align-items:center; justify-content:center; color:var(--grey); font-size:0.85rem; }
  </style>`;
  const body = `<div class="container" style="max-width:800px;">
    <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:1rem;margin-bottom:0.3rem;">
        <div class="page-title">Date de <span>contact</span></div>
        <a href="/contact" target="_blank" class="preview-btn">Previzualizează →</a>
    </div>
    <div class="page-subtitle">Editează informațiile afișate pe pagina de contact.</div>
    ${success ? `<div class="alert alert-success">${esc(success)}</div>` : ''}
    <form method="POST">
        <div class="card"><div class="card-label" style="${labelStyle}">Informații principale</div>
            <div class="form-group"><label>Adresă</label><input type="text" name="contact_adresa" value="${esc(s.contact_adresa)}" placeholder="ex: Strada Exemplu, Nr. 00, București, Sector 0"></div>
            <div class="fg2">
                <div class="form-group"><label>Telefon</label><input type="text" name="contact_telefon" value="${esc(s.contact_telefon)}" placeholder="ex: 0700 000 000"><div class="hint">Afișat ca link de apel direct pe mobil</div></div>
                <div class="form-group"><label>Email</label><input type="email" name="contact_email" value="${esc(s.contact_email)}" placeholder="ex: contact@apg-garage.ro"></div>
            </div>
        </div>
        <div class="card"><div class="card-label" style="${labelStyle}">Program de lucru</div>
            <div class="fg2">
                <div class="form-group"><label>Zilele săptămânii</label><input type="text" name="contact_program_sapt" value="${esc(s.contact_program_sapt)}" placeholder="ex: Luni — Vineri"></div>
                <div class="form-group"><label>Orele</label><input type="text" name="contact_program_ore" value="${esc(s.contact_program_ore)}" placeholder="ex: 09:00 — 17:00"></div>
            </div>
        </div>
        <div class="card"><div class="card-label" style="${labelStyle}">Google Maps</div>
            <div class="form-group"><label>URL embed Google Maps</label><input type="text" name="contact_maps_url" value="${esc(s.contact_maps_url)}" placeholder="https://www.google.com/maps/embed?pb=..." id="maps-url-input" oninput="updateMapsPreview(this.value)"><div class="hint">Mergi pe Google Maps → caută adresa → Share → Embed a map → copiază URL-ul din src="..."</div></div>
            <div id="maps-preview-wrap">${harta}</div>
        </div>
        <button type="submit" class="btn btn-primary" style="width:100%;">Salvează datele de contact</button>
    </form>
  </div>`;
  const bodyEnd = `<script>function updateMapsPreview(url){var wrap=document.getElementById('maps-preview-wrap');if(url.trim()){wrap.innerHTML='<iframe src="'+url+'" width="100%" height="200" style="border:0;" allowfullscreen="" loading="lazy"></iframe>';}else{wrap.innerHTML='<div class="maps-preview" id="maps-placeholder">🗺️ Harta va apărea aici după ce introduci URL-ul</div>';}}</script>`;
  return c.html(page({ title: 'Date contact — Admin APG Garage', user, nav: 'admin', currentPath: '/admin/contact', headExtra, body, bodyEnd }));
}

/* ============================ SETARI SITE ============================ */
app.post('/setari', async (c) => {
  const form = await c.req.formData();
  const actiune = String(form.get('actiune') ?? '');
  const cheie = String(form.get('cheie') ?? '');
  const valoare = String(form.get('valoare') ?? '').trim();
  const permise: Record<string, string[]> = {
    toggle: ['tractari_activ', 'dezmembrari_activ'],
    telefon: ['tractari_telefon', 'dezmembrari_telefon'],
    mesaj: ['tractari_mesaj', 'dezmembrari_mesaj'],
    titlu: ['tractari_titlu', 'dezmembrari_titlu'],
  };
  let success = '';
  if (permise[actiune]?.includes(cheie)) {
    await setSetare(c.env, cheie, actiune === 'toggle' ? String(form.get('valoare') ?? '0') : valoare);
    success = actiune === 'toggle' ? 'Setarea a fost salvată.' : actiune === 'telefon' ? 'Numărul de telefon a fost salvat.' : actiune === 'mesaj' ? 'Mesajul a fost salvat.' : 'Titlul a fost salvat.';
  }
  return renderSetari(c, success);
});

app.get('/setari', async (c) => renderSetari(c, ''));

async function renderSetari(c: AppContext, success: string) {
  const user = c.get('user')!;
  const s = await getSetari(c.env);
  const headExtra = `<style>
    .setare-card { background: var(--dark2); border: 1px solid var(--border); border-left: 4px solid var(--border); padding: 1.5rem; margin-bottom: 1rem; }
    .setare-card.on { border-left-color: #2ecc71; } .setare-card.off { border-left-color: var(--red); }
    .setare-info h3 { font-family: 'Barlow Condensed', sans-serif; font-size: 1.1rem; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 0.3rem; }
    .setare-info p { color: var(--grey); font-size: 0.85rem; }
    .toggle-wrap { display: flex; align-items: center; gap: 1rem; flex-shrink: 0; }
    .toggle-switch { position: relative; width: 56px; height: 28px; flex-shrink: 0; }
    .toggle-switch input { opacity: 0; width: 0; height: 0; }
    .toggle-slider { position: absolute; cursor: pointer; inset: 0; background: #333; transition: 0.3s; border-radius: 28px; }
    .toggle-slider::before { content: ''; position: absolute; height: 20px; width: 20px; left: 4px; bottom: 4px; background: var(--white); transition: 0.3s; border-radius: 50%; }
    input:checked + .toggle-slider { background: #1e8449; } input:checked + .toggle-slider::before { transform: translateX(28px); }
    .toggle-label { font-family: 'Barlow Condensed', sans-serif; font-size: 0.9rem; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; min-width: 80px; }
    .toggle-label.on { color: #2ecc71; } .toggle-label.off { color: var(--red); }
    .preview-link { color: var(--grey); font-size: 0.78rem; text-decoration: none; border: 1px solid var(--border); padding: 0.2rem 0.6rem; transition: all 0.15s; }
    .preview-link:hover { border-color: var(--red); color: var(--red); }
    .telefon-box { display: none; background: var(--black); border: 1px solid var(--border); border-left: 3px solid #f0a500; padding: 1rem; margin-top: 1rem; }
    .telefon-box.visible { display: block; }
    .btn-sm { padding: 0.5rem 1rem; font-size: 0.82rem; }
  </style>`;

  const pagini = [
    { slug: 'tractari', titlu: 'Pagina Tractări', descriere: 'Clienții pot vedea și trimite cereri de tractare de pe site.', url: '/tractari' },
    { slug: 'dezmembrari', titlu: 'Pagina Dezmembrări', descriere: 'Clienții pot vedea mașinile disponibile și cere piese din dezmembrări.', url: '/dezmembrari' },
  ];
  const carduri = pagini.map((info) => {
    const cheieActiv = info.slug + '_activ';
    const activ = (s[cheieActiv] ?? '1') === '1';
    const telefon = s[info.slug + '_telefon'] ?? '';
    const mesaj = s[info.slug + '_mesaj'] ?? '';
    const titlu = s[info.slug + '_titlu'] ?? 'Serviciu indisponibil';
    return `<div class="setare-card ${activ ? 'on' : 'off'}" id="card-${cheieActiv}"><div style="flex:1;">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:1rem;flex-wrap:wrap;margin-bottom:1rem;">
        <div class="setare-info"><h3>${info.titlu}</h3><p>${info.descriere}</p><a href="${info.url}" target="_blank" class="preview-link" style="display:inline-block;margin-top:0.5rem;">Previzualizează →</a></div>
        <div class="toggle-wrap"><span class="toggle-label ${activ ? 'on' : 'off'}" id="label-${cheieActiv}">${activ ? 'Activă' : 'Inactivă'}</span>
            <form method="POST" id="form-${cheieActiv}"><input type="hidden" name="actiune" value="toggle"><input type="hidden" name="cheie" value="${cheieActiv}"><input type="hidden" name="valoare" id="val-${cheieActiv}" value="${activ ? '1' : '0'}">
                <label class="toggle-switch"><input type="checkbox" ${activ ? 'checked' : ''} onchange="toggleSetare('${cheieActiv}', this.checked)"><span class="toggle-slider"></span></label>
            </form>
        </div>
      </div>
      <div class="telefon-box ${!activ ? 'visible' : ''}" id="tel-box-${info.slug}">
        <form method="POST" style="display:flex;gap:0.8rem;align-items:flex-end;flex-wrap:wrap;margin-bottom:1rem;"><input type="hidden" name="actiune" value="titlu"><input type="hidden" name="cheie" value="${info.slug}_titlu"><div class="form-group" style="margin:0;flex:1;min-width:200px;"><label>Titlu afișat când serviciul e dezactivat</label><input type="text" name="valoare" value="${esc(titlu)}" placeholder="ex: Serviciu indisponibil"></div><button type="submit" class="btn btn-outline btn-sm" style="margin-bottom:0;">Salvează</button></form>
        <form method="POST" style="display:flex;gap:0.8rem;align-items:flex-end;flex-wrap:wrap;margin-bottom:1rem;"><input type="hidden" name="actiune" value="telefon"><input type="hidden" name="cheie" value="${info.slug}_telefon"><div class="form-group" style="margin:0;flex:1;min-width:200px;"><label>Telefon afișat când serviciul e dezactivat</label><input type="text" name="valoare" value="${esc(telefon)}" placeholder="ex: 0700 000 000"></div><button type="submit" class="btn btn-outline btn-sm" style="margin-bottom:0;">Salvează</button></form>
        <form method="POST" style="display:flex;gap:0.8rem;align-items:flex-end;flex-wrap:wrap;"><input type="hidden" name="actiune" value="mesaj"><input type="hidden" name="cheie" value="${info.slug}_mesaj"><div class="form-group" style="margin:0;flex:1;"><label>Mesaj afișat când serviciul e dezactivat</label><textarea name="valoare" rows="3" placeholder="Scrie mesajul pentru clienți..." style="resize:vertical;">${esc(mesaj)}</textarea></div><button type="submit" class="btn btn-outline btn-sm" style="margin-bottom:0;align-self:flex-end;">Salvează</button></form>
      </div>
    </div></div>`;
  }).join('');

  const body = `<div class="container" style="max-width:750px;">
    <div class="page-title">Setări <span>site</span></div>
    <div class="page-subtitle">Activează sau dezactivează secțiunile publice ale site-ului.</div>
    ${success ? `<div class="alert alert-success">${esc(success)}</div>` : ''}
    ${carduri}
    <div class="alert alert-info" style="font-size:0.85rem;margin-top:1rem;">Când o pagină este dezactivată, clienții văd un mesaj că serviciul nu este disponibil momentan. Linkurile din meniu rămân vizibile.</div>
  </div>`;
  const bodyEnd = `<script>
    function toggleSetare(cheie,activ){document.getElementById('val-'+cheie).value=activ?'1':'0';var card=document.getElementById('card-'+cheie);var label=document.getElementById('label-'+cheie);var slug=cheie.replace('_activ','');var telBox=document.getElementById('tel-box-'+slug);card.classList.toggle('on',activ);card.classList.toggle('off',!activ);label.className='toggle-label '+(activ?'on':'off');label.textContent=activ?'Activă':'Inactivă';if(telBox)telBox.classList.toggle('visible',!activ);document.getElementById('form-'+cheie).submit();}
  </script>`;
  return c.html(page({ title: 'Setări — Admin APG Garage', user, nav: 'admin', currentPath: '/admin/setari', headExtra, body, bodyEnd }));
}

/* ============================ CONTINUT SITE ============================ */
const CHEI_HOME = ['home_titlu', 'home_subtitlu', 'home_descriere', 'home_tag', 'home_despre_titlu', 'home_ani_experienta', 'home_clienti'];
const CHEI_DESPRE = ['despre_titlu', 'despre_descriere', 'despre_text_1', 'despre_text_2', 'despre_text_3'];

app.post('/continut', async (c) => {
  const form = await c.req.formData();
  for (const cheie of [...CHEI_HOME, ...CHEI_DESPRE]) {
    if (form.get(cheie) !== null) await setSetare(c.env, cheie, String(form.get(cheie)).trim());
  }
  const tab = String(form.get('tab_return') ?? 'home');
  return renderContinut(c, tab, 'Conținutul a fost salvat.');
});

app.get('/continut', async (c) => renderContinut(c, c.req.query('tab') ?? 'home', ''));

async function renderContinut(c: AppContext, tab: string, success: string) {
  const user = c.get('user')!;
  const s = await getSetari(c.env);
  const headExtra = `<style>
    .tabs { display:flex; gap:0; border-bottom:2px solid var(--border); margin-bottom:2rem; }
    .tab { padding:0.8rem 1.5rem; font-family:'Barlow Condensed',sans-serif; font-size:0.95rem; font-weight:700; letter-spacing:1px; text-transform:uppercase; text-decoration:none; color:var(--grey); border-bottom:3px solid transparent; margin-bottom:-2px; transition:all 0.15s; }
    .tab:hover { color:var(--white); } .tab.active { color:var(--white); border-bottom-color:var(--red); }
    .section-card { background:var(--dark2); border:1px solid var(--border); border-top:4px solid var(--red); padding:1.8rem; margin-bottom:1.5rem; }
    .section-card h3 { font-family:'Barlow Condensed',sans-serif; font-size:1.1rem; font-weight:700; text-transform:uppercase; letter-spacing:1px; margin-bottom:1.2rem; color:var(--white); }
    .fg2 { display:grid; grid-template-columns:1fr 1fr; gap:0 1.5rem; } .fg3 { display:grid; grid-template-columns:1fr 1fr 1fr; gap:0 1.5rem; }
    @media(max-width:650px){ .fg2,.fg3 { grid-template-columns:1fr; } }
    .hint { font-size:0.75rem; color:#555; margin-top:0.25rem; }
    .preview-btn { display:inline-block; padding:0.5rem 1.2rem; background:none; border:1px solid var(--border); color:var(--grey); font-family:'Barlow Condensed',sans-serif; font-size:0.85rem; font-weight:700; letter-spacing:1px; text-transform:uppercase; text-decoration:none; transition:all 0.15s; }
    .preview-btn:hover { border-color:var(--red); color:var(--red); }
    .panel { display:none; } .panel.active { display:block; }
  </style>`;
  const body = `<div class="container" style="max-width:850px;">
    <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:1rem;margin-bottom:0.3rem;">
        <div class="page-title">Conținut <span>site</span></div>
        <div style="display:flex;gap:0.5rem;"><a href="/" target="_blank" class="preview-btn">Acasă →</a><a href="/despre" target="_blank" class="preview-btn">Despre noi →</a></div>
    </div>
    <div class="page-subtitle">Editează textele afișate pe paginile principale ale site-ului.</div>
    ${success ? `<div class="alert alert-success">${esc(success)}</div>` : ''}
    <div class="tabs"><a href="?tab=home" class="tab ${tab === 'home' ? 'active' : ''}">Pagina principală</a><a href="?tab=despre" class="tab ${tab === 'despre' ? 'active' : ''}">Despre noi</a></div>
    <div class="panel ${tab === 'home' ? 'active' : ''}"><form method="POST"><input type="hidden" name="tab_return" value="home">
        <div class="section-card"><h3>Secțiunea Hero (prima imagine)</h3>
            <div class="form-group"><label>Tag mic deasupra titlului</label><input type="text" name="home_tag" value="${esc(s.home_tag)}" placeholder="ex: Service Auto București"><div class="hint">Apare pe fundal roșu deasupra titlului mare</div></div>
            <div class="fg2"><div class="form-group"><label>Titlu mare (alb)</label><input type="text" name="home_titlu" value="${esc(s.home_titlu)}" placeholder="ex: APG"></div><div class="form-group"><label>Titlu mare (roșu)</label><input type="text" name="home_subtitlu" value="${esc(s.home_subtitlu)}" placeholder="ex: Garage"></div></div>
            <div class="form-group"><label>Descriere</label><textarea name="home_descriere" rows="3">${esc(s.home_descriere)}</textarea><div class="hint">Textul descriptiv de sub titlu</div></div>
        </div>
        <div class="section-card"><h3>Secțiunea statistici</h3>
            <div class="form-group"><label>Titlu secțiune</label><input type="text" name="home_despre_titlu" value="${esc(s.home_despre_titlu)}" placeholder="ex: De ce APG Garage"></div>
            <div class="fg2">
                <div class="form-group"><label>Ani experiență</label><input type="text" name="home_ani_experienta" value="${esc(s.home_ani_experienta)}" placeholder="ex: 10+"><div class="hint">Numărul afișat mare</div></div>
                <div class="form-group"><label>Clienți mulțumiți</label><input type="text" name="home_clienti" value="${esc(s.home_clienti)}" placeholder="ex: 500+"></div>
            </div>
        </div>
        <button type="submit" class="btn btn-primary" style="width:100%;">Salvează pagina principală</button>
    </form></div>
    <div class="panel ${tab === 'despre' ? 'active' : ''}"><form method="POST"><input type="hidden" name="tab_return" value="despre">
        <div class="section-card"><h3>Header pagină</h3>
            <div class="form-group"><label>Titlu pagină</label><input type="text" name="despre_titlu" value="${esc(s.despre_titlu)}" placeholder="ex: Despre APG Garage"></div>
            <div class="form-group"><label>Subtitlu / descriere scurtă</label><input type="text" name="despre_descriere" value="${esc(s.despre_descriere)}" placeholder="ex: Un service auto cu experiență..."></div>
        </div>
        <div class="section-card"><h3>Povestea noastră</h3>
            <div class="form-group"><label>Paragraful 1</label><textarea name="despre_text_1" rows="4">${esc(s.despre_text_1)}</textarea></div>
            <div class="form-group"><label>Paragraful 2</label><textarea name="despre_text_2" rows="4">${esc(s.despre_text_2)}</textarea></div>
            <div class="form-group"><label>Paragraful 3</label><textarea name="despre_text_3" rows="4">${esc(s.despre_text_3)}</textarea></div>
        </div>
        <button type="submit" class="btn btn-primary" style="width:100%;">Salvează pagina Despre noi</button>
    </form></div>
  </div>`;
  return c.html(page({ title: 'Conținut site — Admin APG Garage', user, nav: 'admin', currentPath: '/admin/continut', headExtra, body }));
}

export default app;
