import { Hono } from 'hono';
import type { Env, Variables, AppContext } from '../../types';
import { page } from '../../views/layout';
import { esc } from '../../lib/format';
import { getToateSeo, ensureServiciiSeo } from '../../lib/serviciiSeo';

const app = new Hono<{ Bindings: Env; Variables: Variables }>();

const STYLE = `<style>
    .seo-card { background:var(--dark2); border:1px solid var(--border); border-left:4px solid var(--border); padding:1.4rem; margin-bottom:1.4rem; }
    .seo-card.activ { border-left-color:#2ecc71; } .seo-card.inactiv { border-left-color:#444; opacity:0.75; }
    .seo-head { display:flex; justify-content:space-between; align-items:center; gap:1rem; flex-wrap:wrap; margin-bottom:1rem; }
    .seo-head h3 { font-family:'Barlow Condensed',sans-serif; font-size:1.2rem; font-weight:700; text-transform:uppercase; letter-spacing:1px; }
    .seo-head h3 small { font-family:'Barlow',sans-serif; font-weight:400; text-transform:none; letter-spacing:0; color:var(--grey); font-size:0.8rem; }
    .adauga-form { background:var(--dark2); border:1px solid var(--border); border-top:4px solid var(--red); padding:1.5rem; margin-bottom:2rem; }
    .adauga-form h3 { font-family:'Barlow Condensed',sans-serif; font-size:1.15rem; font-weight:700; text-transform:uppercase; letter-spacing:1px; margin-bottom:1rem; }
    .btn-sm { padding:0.35rem 0.9rem; font-size:0.8rem; }
    .seo-foot { display:flex; gap:0.5rem; margin-top:0.9rem; border-top:1px solid var(--border); padding-top:0.9rem; flex-wrap:wrap; }
</style>`;

app.post('/pagini-servicii', async (c) => {
  await ensureServiciiSeo(c.env);
  const form = await c.req.formData();
  const actiune = String(form.get('actiune') ?? '');
  const id = parseInt(String(form.get('id') ?? '0'), 10);
  let error = '';
  let success = '';

  if (actiune === 'editeaza' && id) {
    const nume = String(form.get('nume') ?? '').trim();
    const h1 = String(form.get('h1') ?? '').trim();
    const meta = String(form.get('meta') ?? '').trim();
    const intro = String(form.get('intro') ?? '').trim();
    const include = String(form.get('include') ?? '').split('\n').map((x) => x.trim()).filter(Boolean).join('\n');
    const extra = String(form.get('extra') ?? '').trim();
    const ordine = parseInt(String(form.get('ordine') ?? '0'), 10) || 0;
    if (!nume || !h1) error = 'Numele și titlul H1 sunt obligatorii.';
    else {
      await c.env.DB.prepare('UPDATE servicii_seo SET nume=?, h1=?, meta=?, intro=?, include=?, extra=?, ordine=? WHERE id=?')
        .bind(nume, h1, meta, intro, include, extra, ordine, id).run();
      success = 'Pagina a fost salvată.';
    }
  } else if (actiune === 'toggle' && id) {
    await c.env.DB.prepare('UPDATE servicii_seo SET activ = 1 - activ WHERE id=?').bind(id).run();
    return c.redirect('/admin/pagini-servicii');
  } else if (actiune === 'sterge' && id) {
    await c.env.DB.prepare('DELETE FROM servicii_seo WHERE id=?').bind(id).run();
    return c.redirect('/admin/pagini-servicii');
  } else if (actiune === 'adauga') {
    const slug = String(form.get('slug') ?? '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    const nume = String(form.get('nume') ?? '').trim();
    if (!slug || !nume) error = 'Slug-ul și numele sunt obligatorii.';
    else {
      try {
        const row = await c.env.DB.prepare('SELECT MAX(ordine) as m FROM servicii_seo').first<{ m: number }>();
        await c.env.DB.prepare('INSERT INTO servicii_seo (slug, nume, h1, meta, intro, include, extra, ordine) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
          .bind(slug, nume, nume + ' în București', '', '', '', '', (row?.m ?? 0) + 1).run();
        success = 'Pagina a fost creată. Completeaz-o mai jos.';
      } catch {
        error = 'Există deja o pagină cu acest slug.';
      }
    }
  }
  return renderPaginiServicii(c, error, success);
});

app.get('/pagini-servicii', async (c) => renderPaginiServicii(c, '', ''));

async function renderPaginiServicii(c: AppContext, error: string, success: string) {
  const user = c.get('user')!;
  const lista = await getToateSeo(c.env, false);

  const carduri = lista.map((s) => `<div class="seo-card ${s.activ ? 'activ' : 'inactiv'}">
    <div class="seo-head"><h3>${esc(s.nume)} <small>/servicii/${esc(s.slug)}</small></h3></div>
    <form method="POST">
      <input type="hidden" name="actiune" value="editeaza"><input type="hidden" name="id" value="${s.id}">
      <div class="form-group"><label>Nume (card + meniu)</label><input type="text" name="nume" value="${esc(s.nume)}" required></div>
      <div class="form-group"><label>Titlu H1 (pe pagină)</label><input type="text" name="h1" value="${esc(s.h1)}" required></div>
      <div class="form-group"><label>Descriere SEO (meta)</label><textarea name="meta" rows="2">${esc(s.meta)}</textarea></div>
      <div class="form-group"><label>Introducere (paragraf)</label><textarea name="intro" rows="3">${esc(s.intro)}</textarea></div>
      <div class="form-group"><label>Ce include (câte o linie per punct)</label><textarea name="include" rows="6">${esc(s.include.join('\n'))}</textarea></div>
      <div class="form-group"><label>Text suplimentar</label><textarea name="extra" rows="2">${esc(s.extra)}</textarea></div>
      <div style="display:flex;gap:0.8rem;align-items:flex-end;flex-wrap:wrap;">
        <div class="form-group" style="width:110px;margin:0;"><label>Ordine</label><input type="number" name="ordine" value="${s.ordine}"></div>
        <button type="submit" class="btn btn-primary" style="margin-bottom:0;">Salvează</button>
      </div>
    </form>
    <div class="seo-foot">
      <form method="POST"><input type="hidden" name="actiune" value="toggle"><input type="hidden" name="id" value="${s.id}"><button type="submit" class="btn btn-outline btn-sm">${s.activ ? 'Ascunde de pe site' : 'Afișează pe site'}</button></form>
      <a href="/servicii/${esc(s.slug)}" target="_blank" class="btn btn-outline btn-sm">Vezi pagina →</a>
      <form method="POST" onsubmit="return confirm('Ștergi definitiv această pagină de serviciu?')" style="margin-left:auto;"><input type="hidden" name="actiune" value="sterge"><input type="hidden" name="id" value="${s.id}"><button type="submit" class="btn btn-outline btn-sm" style="color:var(--danger);border-color:var(--danger);">Șterge</button></form>
    </div>
  </div>`).join('');

  const body = `<div class="container" style="max-width:820px;">
    <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:1rem;">
      <div class="page-title">Pagini <span>servicii</span></div>
      <a href="/servicii" target="_blank" class="btn btn-outline btn-sm">Vezi lista →</a>
    </div>
    <div class="page-subtitle">Editează categoriile principale de servicii afișate pe site (/servicii).</div>
    ${success ? `<div class="alert alert-success">${esc(success)}</div>` : ''}
    ${error ? `<div class="alert alert-error">${esc(error)}</div>` : ''}

    <div class="adauga-form"><h3>+ Pagină nouă de serviciu</h3>
      <form method="POST" style="display:flex;gap:0.8rem;flex-wrap:wrap;align-items:flex-end;">
        <input type="hidden" name="actiune" value="adauga">
        <div class="form-group" style="margin:0;flex:1;min-width:180px;"><label>Nume serviciu</label><input type="text" name="nume" placeholder="ex: Service climatizare" required></div>
        <div class="form-group" style="margin:0;flex:1;min-width:180px;"><label>Adresă (slug)</label><input type="text" name="slug" placeholder="ex: service-climatizare" required></div>
        <button type="submit" class="btn btn-primary" style="margin-bottom:0;">Creează</button>
      </form>
      <div style="font-size:0.78rem;color:var(--grey);margin-top:0.6rem;">Slug-ul devine adresa paginii: /servicii/&lt;slug&gt;. După creare, completează textul mai jos.</div>
    </div>

    ${carduri}
  </div>`;
  return c.html(page({ title: 'Pagini servicii — Admin APG Garage', user, nav: 'admin', currentPath: '/admin/pagini-servicii', headExtra: STYLE, body }));
}

export default app;
