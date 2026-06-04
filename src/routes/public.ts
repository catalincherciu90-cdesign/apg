import { Hono } from 'hono';
import type { Env, Variables } from '../types';
import { page } from '../views/layout';
import { esc, nl2br, numberFormat } from '../lib/format';
import { getSetari } from '../lib/setari';
import { trimiteEmail, emailTemplate } from '../lib/mailer';

const app = new Hono<{ Bindings: Env; Variables: Variables }>();

const GRID_BG = `repeating-linear-gradient(90deg, transparent, transparent 60px, rgba(255,255,255,0.015) 60px, rgba(255,255,255,0.015) 61px)`;

/* ============================ HOME ============================ */
const HOME_STYLE = `<style>
    .hero { min-height: calc(100vh - var(--nav-height)); display: flex; align-items: center; padding: 3rem 1.5rem; position: relative; overflow: hidden; }
    .hero::before { content: ''; position: absolute; inset: 0; background: ${GRID_BG}; pointer-events: none; }
    .hero-inner { max-width: 1100px; margin: 0 auto; width: 100%; display: flex; align-items: center; gap: 2.5rem; position: relative; z-index: 1; }
    .hero-content { flex: 1 1 520px; max-width: 640px; }
    .hero-art { flex: 1 1 420px; display: flex; justify-content: center; }
    .hero-art img { width: 100%; max-width: 560px; height: auto; filter: drop-shadow(0 12px 28px rgba(0,0,0,0.55)); }
    @media (max-width: 860px) { .hero-inner { flex-direction: column; gap: 1.5rem; } .hero-art img { max-width: 420px; } }
    .hero-tag { display:inline-block; background:var(--red); color:var(--black); font-size:0.7rem; font-weight:700; letter-spacing:3px; text-transform:uppercase; padding:0.3rem 0.8rem; margin-bottom:1.2rem; }
    .hero-title { font-family:'Barlow Condensed',sans-serif; font-size:clamp(3.5rem,12vw,6rem); font-weight:800; line-height:0.95; text-transform:uppercase; letter-spacing:2px; margin-bottom:1.2rem; }
    .hero-title span { color:var(--red); }
    .hero-desc { color:var(--grey-light); font-size:1rem; line-height:1.6; margin-bottom:2rem; max-width:500px; }
    .hero-btns { display:flex; gap:1rem; flex-wrap:wrap; }
    .services-section { padding:4rem 1.5rem; background:var(--black); border-top:1px solid var(--border); border-bottom:1px solid var(--border); }
    .services-section .section-label,.services-section .section-title { text-align:center; }
    .services-grid { display:grid; grid-template-columns:repeat(2,1fr); gap:1rem; max-width:1100px; margin:0 auto; }
    .service-card { background:var(--dark2); border:1px solid var(--border); border-top:3px solid var(--red); padding:1.5rem; }
    .service-card h3 { font-family:'Barlow Condensed',sans-serif; font-size:1.15rem; font-weight:700; text-transform:uppercase; letter-spacing:1px; margin-bottom:0.5rem; }
    .service-card p { color:var(--grey); font-size:0.88rem; line-height:1.6; }
    .why-section { padding:4rem 1.5rem; }
    .why-section .section-label,.why-section .section-title { text-align:center; }
    .why-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:1rem; max-width:1100px; margin:0 auto; }
    .why-item { text-align:center; padding:1.2rem 0.8rem; }
    .why-item .num { font-family:'Barlow Condensed',sans-serif; font-size:2.8rem; font-weight:800; color:var(--red); line-height:1; margin-bottom:0.4rem; }
    .why-item h3 { font-family:'Barlow Condensed',sans-serif; font-size:1rem; font-weight:700; text-transform:uppercase; letter-spacing:1px; margin-bottom:0.4rem; }
    .why-item p { color:var(--grey); font-size:0.85rem; line-height:1.5; }
    .program-section { padding:4rem 1.5rem; text-align:center; background:var(--black); border-top:1px solid var(--border); }
    .program-section h2 { font-family:'Barlow Condensed',sans-serif; font-size:1.8rem; font-weight:800; text-transform:uppercase; letter-spacing:2px; margin-bottom:0.8rem; }
    .program-section h2 span { color:var(--red); }
    .program-section p { color:var(--grey); margin-bottom:0.3rem; }
    @media(max-width:600px) { .services-grid { grid-template-columns:1fr; } .why-grid { grid-template-columns:repeat(2,1fr); } .hero-btns .btn { width:100%; text-align:center; } }
    @media(max-width:380px) { .why-grid { grid-template-columns:1fr; } }
</style>`;

app.get('/', async (c) => {
  const user = c.get('user');
  const s = await getSetari(c.env);
  const heroBtns = user && user.rol !== 'angajat'
    ? `<a href="/rezervare" class="btn btn-primary">Fă o programare</a><a href="/dashboard" class="btn btn-outline">Programările mele</a>`
    : `<a href="/register" class="btn btn-primary">Programează-te acum</a><a href="/preturi" class="btn btn-outline">Vezi prețuri</a>`;

  const body = `<section class="hero"><div class="hero-inner">
    <div class="hero-content">
        <div class="hero-tag">${esc(s.home_tag)}</div>
        <h1 class="hero-title">${esc(s.home_titlu)}<br><span>${esc(s.home_subtitlu)}</span></h1>
        <p class="hero-desc">${esc(s.home_descriere)}</p>
        <div class="hero-btns">${heroBtns}</div>
    </div>
    <div class="hero-art"><img src="/hero.svg" alt="Service auto — mașină pe elevator" width="560" height="385"></div>
  </div></section>
  <section class="services-section">
    <div class="section-label">Ce facem</div>
    <div class="section-title">Serviciile <span>noastre</span></div>
    <div class="services-grid">
        <div class="service-card"><h3>Revizie completă</h3><p>Verificare și înlocuire ulei, filtre, lichide, plăcuțe de frână și toate elementele de uzură.</p></div>
        <div class="service-card"><h3>Reparații mecanice</h3><p>Diagnosticare computerizată și repararea oricărei defecțiuni mecanice.</p></div>
        <div class="service-card"><h3>Sistem de frânare</h3><p>Verificare, reglare și înlocuire componente sistem de frânare.</p></div>
        <div class="service-card"><h3>Suspensie și direcție</h3><p>Diagnosticare și reparare probleme de suspensie, geometrie și direcție.</p></div>
    </div>
  </section>
  <section class="why-section">
    <div class="section-label">De ce noi</div>
    <div class="section-title">${esc(s.home_despre_titlu)}</div>
    <div class="why-grid">
        <div class="why-item"><div class="num">${esc(s.home_ani_experienta)}</div><h3>Ani experiență</h3><p>Pe zeci de mărci și modele.</p></div>
        <div class="why-item"><div class="num">${esc(s.home_clienti)}</div><h3>Clienți mulțumiți</h3><p>Care revin și recomandă.</p></div>
        <div class="why-item"><div class="num">100%</div><h3>Transparență</h3><p>Știi exact ce și cât costă.</p></div>
        <div class="why-item"><div class="num">${esc(s.home_timp_revizie)}</div><h3>Timp mediu revizie</h3><p>Lucrăm eficient.</p></div>
    </div>
  </section>
  <section class="program-section">
    <h2>Program de <span>lucru</span></h2>
    <p>Luni — Vineri</p>
    <p style="font-family:'Barlow Condensed',sans-serif;font-size:1.5rem;font-weight:700;color:var(--white);margin:0.5rem 0 0.5rem;">09:00 — 17:00</p>
    <p style="color:var(--grey);margin-bottom:1.5rem;">Sâmbătă și duminică: închis</p>
    <a href="/contact" class="btn btn-outline">Contactează-ne</a>
  </section>`;
  return c.html(page({ title: 'APG Garage — Servis Auto', user, nav: 'public', headExtra: HOME_STYLE, body }));
});

/* ============================ DESPRE ============================ */
const HERO_SMALL = `.hero-small { padding:3rem 1.5rem 2.5rem; border-bottom:1px solid var(--border); background:var(--black); position:relative; overflow:hidden; } .hero-small::before { content:''; position:absolute; inset:0; background:${GRID_BG}; } .hero-small > * { position:relative; z-index:1; }`;

const DESPRE_STYLE = `<style>
    ${HERO_SMALL}
    .about-grid { display:grid; grid-template-columns:1fr 1fr; gap:2.5rem; align-items:start; margin-bottom:3rem; }
    .about-text p { color:var(--grey-light); line-height:1.8; margin-bottom:1.2rem; font-size:0.97rem; }
    .numbers-row { display:grid; grid-template-columns:repeat(3,1fr); gap:1px; background:var(--border); border:1px solid var(--border); }
    .number-box { background:var(--dark2); padding:2rem 1rem; text-align:center; }
    .number-box .num { font-family:'Barlow Condensed',sans-serif; font-size:2.8rem; font-weight:800; color:var(--red); line-height:1; margin-bottom:0.4rem; }
    .number-box .lbl { font-size:0.72rem; color:var(--grey); letter-spacing:1.2px; text-transform:uppercase; font-weight:600; }
    .team-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:1.2rem; margin-bottom:3rem; }
    .team-card { background:var(--dark2); border:1px solid var(--border); border-top:3px solid var(--red); padding:1.5rem; }
    .team-card .initials { width:48px; height:48px; background:var(--red); color:var(--black); display:flex; align-items:center; justify-content:center; font-family:'Barlow Condensed',sans-serif; font-size:1.2rem; font-weight:800; margin-bottom:0.8rem; }
    .team-card h3 { font-family:'Barlow Condensed',sans-serif; font-size:1.1rem; font-weight:700; text-transform:uppercase; letter-spacing:1px; margin-bottom:0.2rem; }
    .team-card .rol { font-size:0.75rem; color:var(--red); letter-spacing:1.5px; text-transform:uppercase; font-weight:600; margin-bottom:0.6rem; }
    .team-card p { color:var(--grey); font-size:0.88rem; line-height:1.6; }
    .values-grid { display:grid; grid-template-columns:repeat(2,1fr); gap:1.2rem; margin-bottom:3rem; }
    .value-card { background:var(--dark2); border:1px solid var(--border); padding:1.5rem; }
    .value-card .icon { font-size:1.6rem; margin-bottom:0.8rem; }
    .value-card h3 { font-family:'Barlow Condensed',sans-serif; font-size:1.05rem; font-weight:700; text-transform:uppercase; letter-spacing:1px; margin-bottom:0.4rem; }
    .value-card p { color:var(--grey); font-size:0.88rem; line-height:1.6; }
    .cta-box { text-align:center; padding:2.5rem 1.5rem; background:var(--dark2); border:1px solid var(--border); margin-bottom:2rem; }
    @media(max-width:750px) { .about-grid { grid-template-columns:1fr; } .team-grid { grid-template-columns:1fr; } }
    @media(max-width:500px) { .values-grid { grid-template-columns:1fr; } .numbers-row { grid-template-columns:1fr; } }
</style>`;

app.get('/despre', async (c) => {
  const user = c.get('user');
  const s = await getSetari(c.env);
  const texts = [s.despre_text_1, s.despre_text_2, s.despre_text_3].filter(Boolean).map((t) => `<p>${nl2br(t)}</p>`).join('');
  const body = `<section class="hero-small">
    <div class="section-label">Cine suntem</div>
    <div class="page-title">Despre <span>APG Garage</span></div>
    <div class="page-subtitle">${esc(s.despre_descriere)}</div>
  </section>
  <div class="container" style="padding-top:2.5rem;">
    <div class="about-grid">
        <div class="about-text">
            <div class="section-label">Povestea noastră</div>
            <div class="section-title">${esc(s.despre_titlu)}</div>
            ${texts}
        </div>
        <div><div class="numbers-row">
            <div class="number-box"><div class="num">10+</div><div class="lbl">Ani experiență</div></div>
            <div class="number-box"><div class="num">500+</div><div class="lbl">Clienți</div></div>
            <div class="number-box"><div class="num">100%</div><div class="lbl">Transparență</div></div>
        </div></div>
    </div>
    <div style="margin-bottom:3rem;">
        <div class="section-label">Oamenii din spate</div>
        <div class="section-title">Echipa <span>noastră</span></div>
        <div class="team-grid">
            <div class="team-card"><div class="initials">AP</div><h3>Nume Prenume</h3><div class="rol">Mecanic șef</div><p>Peste 15 ani de experiență în diagnosticare și reparații mecanice complexe.</p></div>
            <div class="team-card"><div class="initials">GH</div><h3>Nume Prenume</h3><div class="rol">Mecanic</div><p>Specializat în sisteme de frânare, suspensie și geometrie roți.</p></div>
            <div class="team-card"><div class="initials">MV</div><h3>Nume Prenume</h3><div class="rol">Mecanic</div><p>Expert în motoare și sisteme de alimentare, benzină și diesel.</p></div>
        </div>
    </div>
    <div style="margin-bottom:3rem;">
        <div class="section-label">Ce ne definește</div>
        <div class="section-title">Valorile <span>noastre</span></div>
        <div class="values-grid">
            <div class="value-card"><div class="icon">🔧</div><h3>Calitate</h3><p>Folosim doar piese și materiale de calitate. Nu facem compromisuri cu siguranța mașinii tale.</p></div>
            <div class="value-card"><div class="icon">💬</div><h3>Transparență</h3><p>Îți explicăm clar ce problemă are mașina și ce presupune reparația, înainte să începem.</p></div>
            <div class="value-card"><div class="icon">⏱️</div><h3>Punctualitate</h3><p>Respectăm programările și termenele stabilite. Timpul tău contează.</p></div>
            <div class="value-card"><div class="icon">🛡️</div><h3>Garanție</h3><p>Oferim garanție pentru toate lucrările efectuate.</p></div>
        </div>
    </div>
    <div class="cta-box">
        <div class="section-title">Gata să <span>programezi</span>?</div>
        <p style="color:var(--grey);margin-bottom:1.5rem;">Fă o programare online în câteva minute.</p>
        <a href="/register" class="btn btn-primary">Programează-te acum</a>
    </div>
  </div>`;
  return c.html(page({ title: 'Despre noi — APG Garage', user, nav: 'public', headExtra: DESPRE_STYLE, body }));
});

/* ============================ PRETURI ============================ */
const PRETURI_STYLE = `<style>
    ${HERO_SMALL}
    .disclaimer { background: var(--dark2); border: 1px solid var(--border); border-left: 4px solid var(--grey); padding: 1.2rem 1.5rem; color: var(--grey); font-size: 0.88rem; line-height: 1.6; margin-bottom: 2.5rem; }
    .price-category { margin-bottom: 2.5rem; }
    .price-category-title { font-family: 'Barlow Condensed', sans-serif; font-size: 1.2rem; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; padding: 0.7rem 1.2rem; background: var(--black); border-left: 4px solid var(--red); }
    .price-list { background: var(--dark2); }
    .price-item { display: flex; justify-content: space-between; align-items: center; gap: 1rem; padding: 0.9rem 1.2rem; border-bottom: 1px solid var(--border); font-size: 0.92rem; }
    .price-item:last-of-type { border-bottom: none; }
    .price-item .serviciu { color: var(--white); flex: 1; }
    .price-item .serviciu .nota { display:block; font-size:0.78rem; color:var(--grey); margin-top:0.1rem; }
    .price-item .pret { font-family: 'Barlow Condensed', sans-serif; font-size: 1rem; font-weight: 700; color: var(--red); white-space: nowrap; text-align: right; }
    .cta-banner { background: var(--dark2); border-top: 3px solid var(--red); padding: 3rem 1.5rem; text-align: center; margin-top: 1rem; }
    .cta-banner h2 { font-family: 'Barlow Condensed', sans-serif; font-size: 1.8rem; font-weight: 800; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 0.5rem; }
    .cta-banner p { margin-bottom: 1.5rem; opacity: 0.85; font-size: 0.95rem; }
    .btn-white { background: var(--white); color: var(--black); font-family: 'Barlow Condensed', sans-serif; font-weight: 800; font-size: 1rem; letter-spacing: 1.5px; text-transform: uppercase; padding: 0.8rem 2rem; text-decoration: none; display: inline-block; }
    @media (max-width: 500px) { .price-item { flex-direction: column; align-items: flex-start; gap: 0.3rem; } .price-item .pret { text-align: left; } }
</style>`;

app.get('/preturi', async (c) => {
  const user = c.get('user');
  const { results } = await c.env.DB.prepare('SELECT * FROM preturi WHERE activ = 1 ORDER BY ordine ASC, id ASC').all<any>();
  const grouped = new Map<string, any[]>();
  for (const p of results ?? []) {
    const cat = p.categorie ?? '';
    if (!grouped.has(cat)) grouped.set(cat, []);
    grouped.get(cat)!.push(p);
  }

  let lista: string;
  if (grouped.size === 0) {
    lista = `<div class="card" style="text-align:center;color:var(--grey);padding:3rem;">Prețurile vor fi afișate în curând.</div>`;
  } else {
    lista = '';
    for (const [categorie, randuri] of grouped) {
      const items = randuri.map((p) => `<div class="price-item">
            <span class="serviciu">${esc(p.nume)}${p.nota ? `<span class="nota">${esc(p.nota)}</span>` : ''}</span>
            <span class="pret">de la ${numberFormat(p.pret_de_la, 0)} lei${p.include_piese ? ' + piese' : ''}</span>
        </div>`).join('');
      lista += `<div class="price-category"><div class="price-category-title">${esc(categorie)}</div><div class="price-list">${items}</div></div>`;
    }
  }

  const body = `<section class="hero-small">
    <div class="section-label">Tarife orientative</div>
    <div class="page-title">Prețuri</div>
    <div class="page-subtitle">Lista de prețuri orientative pentru principalele servicii oferite.</div>
  </section>
  <div class="container" style="padding-top:2.5rem;">
    <div class="disclaimer"><strong style="color:var(--white);">Notă:</strong> Prețurile sunt orientative și pot varia în funcție de marca și modelul vehiculului. Prețul final se stabilește după diagnosticare. Toate prețurile includ manopera, piesele sunt separate unde este specificat.</div>
    ${lista}
  </div>
  <div class="cta-banner">
    <h2>Programează o vizită</h2>
    <p>Ai o problemă cu mașina sau vrei o revizie? Fă o programare online acum.</p>
    <a href="/register" class="btn-white">Programează-te</a>
  </div>`;
  return c.html(page({ title: 'Prețuri — APG Garage', user, nav: 'public', headExtra: PRETURI_STYLE, body }));
});

/* ============================ CONTACT ============================ */
const CONTACT_STYLE = `<style>
    ${HERO_SMALL}
    .contact-grid { display: grid; grid-template-columns: 1fr 1.4fr; gap: 2.5rem; align-items: start; }
    @media (max-width: 750px) { .contact-grid { grid-template-columns: 1fr; } }
    .contact-info-item { display: flex; align-items: flex-start; gap: 1rem; padding: 1.2rem 0; border-bottom: 1px solid var(--border); }
    .contact-info-item:last-child { border-bottom: none; }
    .contact-info-item .icon { font-size: 1.2rem; width: 36px; flex-shrink: 0; margin-top: 0.1rem; }
    .contact-info-item .lbl { font-size: 0.72rem; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase; color: var(--red); margin-bottom: 0.3rem; }
    .contact-info-item .val { color: var(--white); font-size: 0.95rem; line-height: 1.5; }
    .contact-info-item .val a { color: var(--white); text-decoration: none; transition: color 0.2s; }
    .contact-info-item .val a:hover { color: var(--red); }
    .program-grid { display: grid; grid-template-columns: 1fr 1fr; }
    .program-row { display: contents; }
    .program-row div { padding: 0.5rem 0; border-bottom: 1px solid var(--border); font-size: 0.88rem; }
    .program-row div:first-child { color: var(--grey-light); }
    .program-row div:last-child { color: var(--grey); text-align: right; }
    .map-wrap { margin-top: 1.5rem; }
    .map-wrap iframe { display:block; width:100%; border:0; }
    .map-placeholder { background: var(--dark2); border: 1px solid var(--border); height: 220px; display: flex; align-items: center; justify-content: center; flex-direction: column; gap: 0.8rem; color: var(--grey); margin-top: 1.5rem; }
    .success-box { text-align: center; padding: 3rem 1.5rem; }
    .success-box .ico { font-size: 2.5rem; margin-bottom: 0.8rem; }
    .success-box h2 { font-family: 'Barlow Condensed', sans-serif; font-size: 1.6rem; font-weight: 800; text-transform: uppercase; margin-bottom: 0.5rem; }
</style>`;

function contactBody(s: Record<string, string>, success: boolean, error: string, v: Record<string, string>): string {
  const telClean = s.contact_telefon.replace(/\s+/g, '');
  const harta = s.contact_maps_url
    ? `<iframe src="${esc(s.contact_maps_url)}" height="220" allowfullscreen="" loading="lazy"></iframe>`
    : `<div class="map-placeholder"><span style="font-size:2rem;">🗺️</span><span style="font-size:0.85rem;">Harta va fi afișată după configurare din admin</span></div>`;
  const formular = success
    ? `<div class="card success-box"><div class="ico">✓</div><h2>Mesaj <span style="color:var(--red)">trimis!</span></h2><p style="color:var(--grey);">Îți vom răspunde în cel mai scurt timp posibil.</p></div>`
    : `${error ? `<div class="alert alert-error">${esc(error)}</div>` : ''}<div class="card"><form method="POST">
        <div class="form-group"><label>Nume complet *</label><input type="text" name="nume" value="${esc(v.nume ?? '')}" required></div>
        <div class="form-group"><label>Email *</label><input type="email" name="email" value="${esc(v.email ?? '')}" required></div>
        <div class="form-group"><label>Telefon</label><input type="tel" name="telefon" value="${esc(v.telefon ?? '')}"></div>
        <div class="form-group"><label>Mesaj *</label><textarea name="mesaj" rows="5" placeholder="Scrie întrebarea sau mesajul tău..." required>${esc(v.mesaj ?? '')}</textarea></div>
        <button type="submit" class="btn btn-primary" style="width:100%;">Trimite mesajul</button>
    </form></div>`;

  return `<section class="hero-small">
    <div class="section-label">Suntem aici</div>
    <div class="page-title">Contact</div>
    <div class="page-subtitle">Scrie-ne, sună-ne sau vino direct la servis.</div>
  </section>
  <div class="container" style="padding-top:2.5rem;"><div class="contact-grid">
    <div>
        <div class="section-label">Date de contact</div>
        <div class="section-title">Găsește-<span>ne</span></div>
        <div class="card" style="padding:0 1.2rem;">
            <div class="contact-info-item"><div class="icon">📍</div><div><div class="lbl">Adresă</div><div class="val">${nl2br(s.contact_adresa)}</div></div></div>
            <div class="contact-info-item"><div class="icon">📞</div><div><div class="lbl">Telefon</div><div class="val"><a href="tel:${esc(telClean)}">${esc(s.contact_telefon)}</a></div></div></div>
            <div class="contact-info-item"><div class="icon">✉️</div><div><div class="lbl">Email</div><div class="val"><a href="mailto:${esc(s.contact_email)}">${esc(s.contact_email)}</a></div></div></div>
            <div class="contact-info-item"><div class="icon">🕐</div><div><div class="lbl">Program</div><div class="val"><div class="program-grid">
                <div class="program-row"><div>${esc(s.contact_program_sapt)}</div><div>${esc(s.contact_program_ore)}</div></div>
                <div class="program-row" style="opacity:0.4;"><div>Sâmbătă — Duminică</div><div>Închis</div></div>
            </div></div></div></div>
        </div>
        <div class="map-wrap">${harta}</div>
    </div>
    <div>
        <div class="section-label">Trimite un mesaj</div>
        <div class="section-title">Scrie-<span>ne</span></div>
        ${formular}
    </div>
  </div></div>`;
}

app.get('/contact', async (c) => {
  const user = c.get('user');
  const s = await getSetari(c.env);
  return c.html(page({ title: 'Contact — APG Garage', user, nav: 'public', headExtra: CONTACT_STYLE, body: contactBody(s, false, '', {}) }));
});

app.post('/contact', async (c) => {
  const user = c.get('user');
  const s = await getSetari(c.env);
  const form = await c.req.formData();
  const nume = String(form.get('nume') ?? '').trim();
  const email = String(form.get('email') ?? '').trim();
  const telefon = String(form.get('telefon') ?? '').trim();
  const mesaj = String(form.get('mesaj') ?? '').trim();
  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  let error = '';
  let success = false;
  if (!nume || !email || !mesaj) {
    error = 'Completează toate câmpurile obligatorii.';
  } else if (!emailValid) {
    error = 'Adresa de email nu este validă.';
  } else {
    const html = emailTemplate('Mesaj nou de pe site', `<table class="info-table">
        <tr><td>Nume</td><td>${esc(nume)}</td></tr>
        <tr><td>Email</td><td>${esc(email)}</td></tr>
        <tr><td>Telefon</td><td>${esc(telefon || '—')}</td></tr>
      </table><p>${nl2br(mesaj)}</p>`);
    c.executionCtx.waitUntil(trimiteEmail(c.env, s.contact_email, 'Mesaj nou de pe site — ' + nume, html));
    success = true;
  }
  const vals: Record<string, string> = success ? {} : { nume, email, telefon, mesaj };
  return c.html(page({ title: 'Contact — APG Garage', user, nav: 'public', headExtra: CONTACT_STYLE, body: contactBody(s, success, error, vals) }));
});

/* ============================ TRACTARI ============================ */
const TRACTARI_STYLE = `<style>
    ${HERO_SMALL}
    .tractare-grid { display: grid; grid-template-columns: 1fr 1.3fr; gap: 2.5rem; align-items: start; }
    @media (max-width: 750px) { .tractare-grid { grid-template-columns: 1fr; } }
    .info-box { background: var(--dark2); border: 1px solid var(--border); border-top: 4px solid var(--red); padding: 1.5rem; margin-bottom: 1.2rem; }
    .info-box h3 { font-family: 'Barlow Condensed', sans-serif; font-size: 1.1rem; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 0.8rem; }
    .info-item { display: flex; align-items: flex-start; gap: 0.8rem; padding: 0.7rem 0; border-bottom: 1px solid var(--border); font-size: 0.9rem; }
    .info-item:last-child { border-bottom: none; }
    .info-item .icon { font-size: 1.2rem; flex-shrink: 0; }
    .info-item .text { color: var(--grey-light); line-height: 1.5; }
    .info-item .text strong { color: var(--white); display: block; font-size: 0.8rem; margin-bottom: 0.1rem; }
    .masina-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0 1rem; }
    @media (max-width: 500px) { .masina-grid { grid-template-columns: 1fr; } }
    .success-box { text-align: center; padding: 3rem 1.5rem; }
    .success-box .ico { font-size: 3rem; margin-bottom: 1rem; }
    .success-box h2 { font-family: 'Barlow Condensed', sans-serif; font-size: 1.8rem; font-weight: 800; text-transform: uppercase; margin-bottom: 0.5rem; }
    .success-box p { color: var(--grey); margin-bottom: 1.5rem; }
    .urgenta-bar { background: var(--dark2); border-bottom: 2px solid var(--red); padding: 0.8rem 1.5rem; display: flex; align-items: center; justify-content: space-between; gap: 1rem; flex-wrap: wrap; }
    .urgenta-bar p { font-size: 0.9rem; font-weight: 600; }
    .urgenta-bar a { color: var(--white); font-family: 'Barlow Condensed', sans-serif; font-size: 1rem; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; text-decoration: none; background: rgba(0,0,0,0.3); padding: 0.4rem 1rem; white-space: nowrap; }
</style>`;

function tractariInactiv(s: Record<string, string>): string {
  const cta = s.tractari_telefon
    ? `<a href="tel:${esc(s.tractari_telefon.replace(/\s+/g, ''))}" class="btn btn-primary" style="font-size:1.1rem;">📞 ${esc(s.tractari_telefon)}</a>`
    : `<a href="/contact" class="btn btn-primary">Contactează-ne</a>`;
  return `<div class="container" style="padding-top:4rem;padding-bottom:4rem;text-align:center;">
    <div style="font-size:3rem;margin-bottom:1rem;">🚛</div>
    <div class="page-title" style="margin-bottom:0.5rem;">${esc(s.tractari_titlu)}</div>
    <p style="color:var(--grey);margin-bottom:1.5rem;max-width:480px;margin-left:auto;margin-right:auto;line-height:1.7;">${nl2br(s.tractari_mesaj)}</p>
    ${cta}
  </div>`;
}

function tractariBody(user: any, success: boolean, error: string, v: Record<string, string>): string {
  const formular = success
    ? `<div class="card success-box"><div class="ico">✓</div><h2>Cerere <span style="color:var(--red)">trimisă!</span></h2><p>Am primit cererea ta. Te vom contacta în cel mai scurt timp la numărul de telefon furnizat.</p><a href="/" class="btn btn-primary">Înapoi acasă</a></div>`
    : `${error ? `<div class="alert alert-error">${esc(error)}</div>` : ''}<div class="card"><form method="POST">
        <div class="section-label" style="margin-bottom:1rem;">Date contact</div>
        <div class="masina-grid">
            <div class="form-group"><label>Nume complet *</label><input type="text" name="nume" value="${esc(v.nume ?? (user ? user.nume : ''))}" required></div>
            <div class="form-group"><label>Telefon *</label><input type="tel" name="telefon" value="${esc(v.telefon ?? '')}" required></div>
        </div>
        <div class="form-group"><label>Locația mașinii * <span style="color:var(--grey);font-weight:400;text-transform:none;letter-spacing:0;">(adresă sau reper)</span></label><input type="text" name="locatie" value="${esc(v.locatie ?? '')}" placeholder="ex: Str. Exemplu nr. 10, Sector 1 / lângă mall Băneasa" required></div>
        <div class="section-label" style="margin:1.2rem 0 1rem;">Datele mașinii</div>
        <div class="form-group"><label>Număr înmatriculare</label><input type="text" name="nr_inmatriculare" value="${esc(v.nr_inmatriculare ?? '')}" placeholder="ex: B 123 ABC" style="text-transform:uppercase;"></div>
        <div class="masina-grid">
            <div class="form-group"><label>Producător</label><input type="text" name="producator" value="${esc(v.producator ?? '')}" placeholder="ex: Volkswagen"></div>
            <div class="form-group"><label>Model</label><input type="text" name="model" value="${esc(v.model ?? '')}" placeholder="ex: Golf 7"></div>
        </div>
        <div class="form-group"><label>Descriere problemă</label><textarea name="descriere_problema" rows="4" placeholder="Descrie pe scurt ce s-a întâmplat cu mașina...">${esc(v.descriere_problema ?? '')}</textarea></div>
        <button type="submit" class="btn btn-primary" style="width:100%;">Trimite cererea de tractare</button>
    </form></div>`;

  return `<div class="urgenta-bar"><p>🚨 Ai nevoie urgentă de tractare? Sună-ne direct!</p><a href="tel:+40700000000">📞 0700 000 000</a></div>
  <section class="hero-small">
    <div class="section-label">Serviciu non-stop</div>
    <div class="page-title">Tractări <span>auto</span></div>
    <div class="page-subtitle">Completează formularul și te contactăm în cel mai scurt timp.</div>
  </section>
  <div class="container" style="padding-top:2.5rem;"><div class="tractare-grid">
    <div>
        <div class="info-box"><h3>Cum funcționează?</h3>
            <div class="info-item"><div class="icon">📋</div><div class="text"><strong>1. Completezi formularul</strong>Introduci locația, datele mașinii și descrii problema.</div></div>
            <div class="info-item"><div class="icon">📞</div><div class="text"><strong>2. Te sunăm înapoi</strong>Echipa noastră te contactează în cel mai scurt timp pentru a confirma.</div></div>
            <div class="info-item"><div class="icon">🚛</div><div class="text"><strong>3. Trimitem mașina de tractare</strong>Ajungem la locația ta și transportăm vehiculul în siguranță la servis.</div></div>
        </div>
        <div class="info-box"><h3>Zonele de acoperire</h3>
            <div class="info-item"><div class="icon">📍</div><div class="text"><strong>București și Ilfov</strong>Acoperire completă în toată zona metropolitană.</div></div>
            <div class="info-item"><div class="icon">🕐</div><div class="text"><strong>Program</strong>Luni — Vineri: 08:00 — 20:00<br>Weekend: la cerere</div></div>
        </div>
    </div>
    <div>${formular}</div>
  </div></div>`;
}

app.get('/tractari', async (c) => {
  const user = c.get('user');
  const s = await getSetari(c.env);
  if (s.tractari_activ !== '1') return c.html(page({ title: 'Tractări auto — APG Garage', user, nav: 'public', headExtra: TRACTARI_STYLE, body: tractariInactiv(s) }));
  return c.html(page({ title: 'Tractări auto — APG Garage', user, nav: 'public', headExtra: TRACTARI_STYLE, body: tractariBody(user, false, '', {}) }));
});

app.post('/tractari', async (c) => {
  const user = c.get('user');
  const s = await getSetari(c.env);
  if (s.tractari_activ !== '1') return c.html(page({ title: 'Tractări auto — APG Garage', user, nav: 'public', headExtra: TRACTARI_STYLE, body: tractariInactiv(s) }));
  const form = await c.req.formData();
  const nume = String(form.get('nume') ?? '').trim();
  const telefon = String(form.get('telefon') ?? '').trim();
  const locatie = String(form.get('locatie') ?? '').trim();
  const nr = String(form.get('nr_inmatriculare') ?? '').trim().toUpperCase();
  const producator = String(form.get('producator') ?? '').trim();
  const model = String(form.get('model') ?? '').trim();
  const descriere = String(form.get('descriere_problema') ?? '').trim();

  let error = '';
  let success = false;
  if (!nume || !telefon || !locatie) {
    error = 'Completează numele, telefonul și locația.';
  } else {
    await c.env.DB.prepare('INSERT INTO tractari (user_id, nume, telefon, locatie, nr_inmatriculare, producator, model, descriere_problema) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
      .bind(user ? user.uid : null, nume, telefon, locatie, nr, producator, model, descriere).run();
    const continut = `<p>O nouă cerere de tractare a fost înregistrată.</p><table class="info-table">
        <tr><td>Nume</td><td>${esc(nume)}</td></tr>
        <tr><td>Telefon</td><td>${esc(telefon)}</td></tr>
        <tr><td>Locație</td><td>${esc(locatie)}</td></tr>
        <tr><td>Mașina</td><td>${esc(nr + ' ' + producator + ' ' + model)}</td></tr>
        <tr><td>Problemă</td><td>${esc(descriere || '—')}</td></tr>
      </table><a href="${c.env.BASE_URL}/admin/tractari" class="btn">Vezi cererea în admin</a>`;
    c.executionCtx.waitUntil(trimiteEmail(c.env, c.env.MAIL_ADMIN, 'Cerere tractare nouă — ' + nume, emailTemplate('Cerere tractare nouă', continut)));
    success = true;
  }
  const vals: Record<string, string> = success ? {} : { nume, telefon, locatie, nr_inmatriculare: nr, producator, model, descriere_problema: descriere };
  return c.html(page({ title: 'Tractări auto — APG Garage', user, nav: 'public', headExtra: TRACTARI_STYLE, body: tractariBody(user, success, error, vals) }));
});

/* ============================ DEZMEMBRARI ============================ */
const DEZM_STYLE = `<style>
    ${HERO_SMALL}
    .dezm-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 1.2rem; margin-bottom: 2.5rem; }
    .dezm-card { background: var(--dark2); border: 1px solid var(--border); border-top: 4px solid var(--border); padding: 1.5rem; cursor: pointer; transition: all 0.2s; position: relative; }
    .dezm-card:hover { border-color: var(--red); }
    .dezm-card.selected { border-color: var(--red); border-top-color: var(--red); background: rgba(192,57,43,0.05); }
    .dezm-card h3 { font-family: 'Barlow Condensed', sans-serif; font-size: 1.3rem; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 0.3rem; }
    .dezm-card .an { color: var(--red); font-size: 0.85rem; font-weight: 600; margin-bottom: 0.8rem; }
    .dezm-card .motorizare { color: var(--grey); font-size: 0.85rem; margin-bottom: 0.8rem; }
    .dezm-card .descriere { color: var(--grey-light); font-size: 0.85rem; line-height: 1.6; }
    .selected-badge { position: absolute; top: 0.8rem; right: 0.8rem; background: var(--red); color: var(--black); font-size: 0.68rem; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; padding: 0.2rem 0.6rem; }
    .btn-cerere { display: block; width: 100%; margin-top: 1rem; padding: 0.5rem; background: none; border: 1px solid var(--border); color: var(--grey); font-family: 'Barlow Condensed', sans-serif; font-size: 0.88rem; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; cursor: pointer; transition: all 0.15s; text-align: center; }
    .btn-cerere:hover, .dezm-card.selected .btn-cerere { border-color: var(--red); color: var(--red); }
    .dezm-card.selected .btn-cerere { background: var(--red); color: var(--black); }
    .cerere-section { background: var(--dark2); border: 1px solid var(--border); border-top: 4px solid var(--red); padding: 2rem; margin-bottom: 2rem; display: none; }
    .cerere-section.visible { display: block; }
    .cerere-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; flex-wrap: wrap; gap: 0.5rem; }
    .cerere-header h3 { font-family: 'Barlow Condensed', sans-serif; font-size: 1.3rem; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; }
    .cerere-header h3 span { color: var(--red); }
    .fg2 { display: grid; grid-template-columns: 1fr 1fr; gap: 0 1rem; }
    @media (max-width: 500px) { .fg2 { grid-template-columns: 1fr; } }
    .empty-state { text-align: center; padding: 4rem 2rem; color: var(--grey); }
    .empty-state p { margin-bottom: 1rem; }
    .success-box { text-align: center; padding: 3rem 1.5rem; background: var(--dark2); border: 1px solid var(--border); }
    .success-box .ico { font-size: 3rem; margin-bottom: 1rem; }
    .success-box h2 { font-family: 'Barlow Condensed', sans-serif; font-size: 1.8rem; font-weight: 800; text-transform: uppercase; margin-bottom: 0.5rem; }
    .success-box p { color: var(--grey); margin-bottom: 1.5rem; }
</style>`;

const DEZM_SCRIPT = `<script>
function selectMasina(id,nume){document.querySelectorAll('.dezm-card').forEach(function(c){c.classList.remove('selected');});document.querySelectorAll('.selected-badge').forEach(function(b){b.remove();});var card=document.getElementById('card-'+id);card.classList.add('selected');var badge=document.createElement('div');badge.className='selected-badge';badge.textContent='Selectată';card.prepend(badge);document.getElementById('dezm-id-input').value=id;document.getElementById('masina-selectata-text').textContent=nume;document.getElementById('cerere-section').classList.add('visible');document.getElementById('cerere-section').scrollIntoView({behavior:'smooth',block:'start'});}
function deselectMasina(){document.querySelectorAll('.dezm-card').forEach(function(c){c.classList.remove('selected');});document.querySelectorAll('.selected-badge').forEach(function(b){b.remove();});document.getElementById('cerere-section').classList.remove('visible');document.getElementById('dezm-id-input').value='';}
</script>`;

function dezmInactiv(s: Record<string, string>): string {
  const cta = s.dezmembrari_telefon
    ? `<a href="tel:${esc(s.dezmembrari_telefon.replace(/\s+/g, ''))}" class="btn btn-primary" style="font-size:1.1rem;">📞 ${esc(s.dezmembrari_telefon)}</a>`
    : `<a href="/contact" class="btn btn-primary">Contactează-ne</a>`;
  return `<div class="container" style="padding-top:4rem;padding-bottom:4rem;text-align:center;">
    <div style="font-size:3rem;margin-bottom:1rem;">🔧</div>
    <div class="page-title" style="margin-bottom:0.5rem;">${esc(s.dezmembrari_titlu)}</div>
    <p style="color:var(--grey);margin-bottom:1.5rem;max-width:480px;margin-left:auto;margin-right:auto;line-height:1.7;">${nl2br(s.dezmembrari_mesaj)}</p>
    ${cta}
  </div>`;
}

function dezmBody(user: any, masini: any[], selectedId: number, success: boolean, error: string, v: Record<string, string>): string {
  let content = '';
  if (success) {
    content += `<div class="success-box" style="margin-bottom:2rem;"><div class="ico">✓</div><h2>Cerere <span style="color:var(--red)">trimisă!</span></h2><p>Am primit cererea ta. Te vom contacta în cel mai scurt timp cu disponibilitatea piesei.</p><a href="/dezmembrari" class="btn btn-primary">Caută alte piese</a></div>`;
  }
  if (error) content += `<div class="alert alert-error">${esc(error)}</div>`;

  if (masini.length === 0) {
    content += `<div class="empty-state"><p>Momentan nu avem mașini disponibile la dezmembrat.</p><p>Revino în curând sau contactează-ne direct.</p><a href="/contact" class="btn btn-outline">Contactează-ne</a></div>`;
  } else {
    const carduri = masini.map((m) => {
      const eticheta = esc(m.producator + ' ' + m.model + ' ' + (m.an_fabricatie ?? '')).replace(/'/g, "\\'");
      const sel = selectedId === m.id;
      return `<div class="dezm-card ${sel ? 'selected' : ''}" id="card-${m.id}" onclick="selectMasina(${m.id}, '${eticheta}')">
        ${sel ? '<div class="selected-badge">Selectată</div>' : ''}
        <h3>${esc(m.producator)} ${esc(m.model)}</h3>
        <div class="an">${esc(m.an_fabricatie || '—')}</div>
        ${m.motorizare ? `<div class="motorizare">Motor: ${esc(m.motorizare)}</div>` : ''}
        ${m.descriere ? `<div class="descriere">${esc(m.descriere)}</div>` : ''}
        <button class="btn-cerere" onclick="event.stopPropagation(); selectMasina(${m.id}, '${eticheta}')">Cer o piesă →</button>
      </div>`;
    }).join('');

    let selectedText = '';
    if (selectedId) {
      const m = masini.find((x) => x.id === selectedId);
      if (m) selectedText = esc(m.producator + ' ' + m.model + ' ' + (m.an_fabricatie ?? ''));
    }

    content += `<div class="section-label" style="margin-bottom:1rem;">Mașini disponibile la dezmembrat</div>
    <p style="color:var(--grey);font-size:0.88rem;margin-bottom:1.5rem;">Click pe o mașină pentru a cere o piesă specifică.</p>
    <div class="dezm-grid" id="dezm-grid">${carduri}</div>
    <div class="cerere-section ${selectedId ? 'visible' : ''}" id="cerere-section">
        <div class="cerere-header"><h3>Cerere piesă — <span id="masina-selectata-text">${selectedText}</span></h3>
        <button onclick="deselectMasina()" style="background:none;border:1px solid var(--border);color:var(--grey);padding:0.3rem 0.7rem;cursor:pointer;font-size:0.82rem;">✕ Anulează</button></div>
        <form method="POST" id="cerere-form">
            <input type="hidden" name="dezmembrare_id" id="dezm-id-input" value="${selectedId || ''}">
            <div class="fg2">
                <div class="form-group"><label>Nume complet *</label><input type="text" name="nume" value="${esc(v.nume ?? (user ? user.nume : ''))}" required></div>
                <div class="form-group"><label>Telefon *</label><input type="tel" name="telefon" value="${esc(v.telefon ?? '')}" required></div>
            </div>
            <div class="form-group"><label>Piesa dorită *</label><textarea name="piesa_dorita" rows="3" placeholder="ex: Ușă față dreapta, oglindă, motor complet, cutie viteze..." required>${esc(v.piesa_dorita ?? '')}</textarea></div>
            <button type="submit" class="btn btn-primary">Trimite cererea</button>
        </form>
    </div>`;
  }

  return `<section class="hero-small">
    <div class="section-label">Piese second-hand</div>
    <div class="page-title">Piese din <span>dezmembrări</span></div>
    <div class="page-subtitle">Alege mașina dezmembrată și întreabă despre piesa de care ai nevoie.</div>
  </section>
  <div class="container" style="padding-top:2.5rem;">${content}</div>`;
}

app.get('/dezmembrari', async (c) => {
  const user = c.get('user');
  const s = await getSetari(c.env);
  if (s.dezmembrari_activ !== '1') return c.html(page({ title: 'Piese din dezmembrări — APG Garage', user, nav: 'public', headExtra: DEZM_STYLE, body: dezmInactiv(s) }));
  const { results } = await c.env.DB.prepare('SELECT * FROM dezmembrari WHERE activ = 1 ORDER BY producator, model').all<any>();
  const selectedId = parseInt(c.req.query('masina') ?? '0', 10);
  return c.html(page({ title: 'Piese din dezmembrări — APG Garage', user, nav: 'public', headExtra: DEZM_STYLE, body: dezmBody(user, results ?? [], selectedId, false, '', {}), bodyEnd: DEZM_SCRIPT }));
});

app.post('/dezmembrari', async (c) => {
  const user = c.get('user');
  const s = await getSetari(c.env);
  if (s.dezmembrari_activ !== '1') return c.html(page({ title: 'Piese din dezmembrări — APG Garage', user, nav: 'public', headExtra: DEZM_STYLE, body: dezmInactiv(s) }));
  const { results: masini } = await c.env.DB.prepare('SELECT * FROM dezmembrari WHERE activ = 1 ORDER BY producator, model').all<any>();
  const form = await c.req.formData();
  const dezmId = parseInt(String(form.get('dezmembrare_id') ?? '0'), 10);
  const nume = String(form.get('nume') ?? '').trim();
  const telefon = String(form.get('telefon') ?? '').trim();
  const piesa = String(form.get('piesa_dorita') ?? '').trim();

  let error = '';
  let success = false;
  let selectedId = dezmId;
  if (!nume || !telefon || !piesa || !dezmId) {
    error = 'Completează toate câmpurile obligatorii.';
  } else {
    const m = await c.env.DB.prepare('SELECT * FROM dezmembrari WHERE id = ? AND activ = 1').bind(dezmId).first<any>();
    if (!m) {
      error = 'Mașina selectată nu mai este disponibilă.';
    } else {
      await c.env.DB.prepare('INSERT INTO cereri_piese (user_id, dezmembrare_id, nume, telefon, piesa_dorita) VALUES (?, ?, ?, ?, ?)')
        .bind(user ? user.uid : null, dezmId, nume, telefon, piesa).run();
      const continut = `<p>O nouă cerere de piesă din dezmembrări a fost înregistrată.</p><table class="info-table">
          <tr><td>Client</td><td>${esc(nume)}</td></tr>
          <tr><td>Telefon</td><td>${esc(telefon)}</td></tr>
          <tr><td>Mașina dezmembrată</td><td>${esc(m.producator + ' ' + m.model + ' ' + (m.an_fabricatie ?? ''))}</td></tr>
          <tr><td>Piesa dorită</td><td>${esc(piesa)}</td></tr>
        </table><a href="${c.env.BASE_URL}/admin/dezmembrari" class="btn">Vezi cererea în admin</a>`;
      c.executionCtx.waitUntil(trimiteEmail(c.env, c.env.MAIL_ADMIN, 'Cerere piesă dezmembrări — ' + nume, emailTemplate('Cerere piesă nouă', continut)));
      success = true;
      selectedId = 0;
    }
  }
  const vals: Record<string, string> = success ? {} : { nume, telefon, piesa_dorita: piesa };
  return c.html(page({ title: 'Piese din dezmembrări — APG Garage', user, nav: 'public', headExtra: DEZM_STYLE, body: dezmBody(user, masini ?? [], selectedId, success, error, vals), bodyEnd: DEZM_SCRIPT }));
});

export default app;
