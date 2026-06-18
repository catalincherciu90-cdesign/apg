import { Hono } from 'hono';
import type { Env, Variables } from '../types';
import { page, SITE_URL } from '../views/layout';
import { esc, nl2br, numberFormat } from '../lib/format';
import { getSetari, paginaActiva } from '../lib/setari';
import { notificareMesajContact, notificareCerereTractare, notificareCererePiesa } from '../lib/notificari';
import { ensureMesaje } from '../lib/mesaje';
import { ensureRecenzii, stele, verifyReviewToken, numeScurt } from '../lib/recenzii';

const app = new Hono<{ Bindings: Env; Variables: Variables }>();

const GRID_BG = `repeating-linear-gradient(90deg, transparent, transparent 60px, rgba(255,255,255,0.015) 60px, rgba(255,255,255,0.015) 61px)`;

// Pagină dezactivată din admin (Setări site)
function paginaIndisponibila(c: any, titlu = 'Pagină indisponibilă') {
  const body = `<div class="container" style="padding-top:4rem;padding-bottom:4rem;text-align:center;">
    <div style="font-size:3rem;margin-bottom:1rem;">🔧</div>
    <div class="page-title" style="margin-bottom:0.5rem;">${esc(titlu)}</div>
    <p style="color:var(--grey);margin-bottom:1.5rem;max-width:480px;margin-left:auto;margin-right:auto;line-height:1.7;">Această pagină este momentan indisponibilă. Revino în curând sau contactează-ne direct.</p>
    <a href="/contact" class="btn btn-primary">Contact</a> <a href="/" class="btn btn-outline">Acasă</a>
  </div>`;
  return c.html(page({ title: 'Indisponibil — APG Garage', user: c.get('user'), nav: 'public', pagini: c.get('pagini'), robots: 'noindex, nofollow', body }));
}

/* ============================ HOME ============================ */
const HOME_STYLE = `<style>
    .hero { min-height: calc(100vh - var(--nav-height)); display: flex; align-items: center; padding: 3rem 1.5rem; position: relative; overflow: hidden; background-color: #08090b; background-image: url('/hero.jpg'); background-image: -webkit-image-set(url('/hero.webp') type('image/webp'), url('/hero.jpg') type('image/jpeg')); background-image: image-set(url('/hero.webp') type('image/webp'), url('/hero.jpg') type('image/jpeg')); background-size: cover; background-position: center right; background-repeat: no-repeat; }
    .hero::before { content: ''; position: absolute; inset: 0; background: linear-gradient(90deg, rgba(8,9,11,0.97) 0%, rgba(8,9,11,0.9) 28%, rgba(8,9,11,0.5) 52%, rgba(8,9,11,0.12) 74%, rgba(8,9,11,0) 100%); pointer-events: none; }
    .hero-inner { max-width: 1100px; margin: 0 auto; width: 100%; position: relative; z-index: 1; }
    .hero-content { max-width: 600px; }
    @media (max-width: 760px) { .hero { background-position: 72% center; } .hero::before { background: linear-gradient(180deg, rgba(8,9,11,0.6) 0%, rgba(8,9,11,0.82) 55%, rgba(8,9,11,0.93) 100%); } }
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
    .why-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:1rem; max-width:900px; margin:0 auto; }
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
    .cta-photo { position: relative; min-height: clamp(380px, 56vh, 600px); display: flex; align-items: center; padding: 3rem 1.5rem; overflow: hidden; background-color: #08090b; background-image: url('/banner2.jpg'); background-image: -webkit-image-set(url('/banner2.webp') type('image/webp'), url('/banner2.jpg') type('image/jpeg')); background-image: image-set(url('/banner2.webp') type('image/webp'), url('/banner2.jpg') type('image/jpeg')); background-size: cover; background-position: center right; background-repeat: no-repeat; }
    .cta-photo::before { content: ''; position: absolute; inset: 0; background: linear-gradient(90deg, rgba(8,9,11,0.96) 0%, rgba(8,9,11,0.88) 28%, rgba(8,9,11,0.45) 54%, rgba(8,9,11,0.1) 78%, rgba(8,9,11,0) 100%); pointer-events: none; }
    .cta-photo .cta-inner { max-width: 1100px; margin: 0 auto; width: 100%; position: relative; z-index: 1; }
    .cta-photo .cta-box { max-width: 560px; }
    .cta-photo h2 { font-family:'Barlow Condensed',sans-serif; font-size: clamp(2rem,5vw,3rem); font-weight: 800; text-transform: uppercase; letter-spacing: 2px; line-height: 1.05; margin-bottom: 1rem; }
    .cta-photo h2 span { color: var(--red); }
    .cta-photo p { color: var(--grey-light); font-size: 1rem; line-height: 1.6; margin-bottom: 1.8rem; max-width: 460px; }
    @media(max-width:760px) { .cta-photo { background-position: 72% center; } .cta-photo::before { background: linear-gradient(180deg, rgba(8,9,11,0.62) 0%, rgba(8,9,11,0.82) 55%, rgba(8,9,11,0.93) 100%); } }
</style>`;

app.get('/', async (c) => {
  const user = c.get('user');
  const s = await getSetari(c.env);
  await ensureRecenzii(c.env);
  const { results: recenzii } = await c.env.DB.prepare('SELECT nume, rating, text FROM recenzii WHERE activ = 1 ORDER BY ordine ASC, created_at DESC LIMIT 12').all<any>();
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
  </div></section>
  <section class="services-section">
    <div class="section-label">Ce facem</div>
    <div class="section-title">Serviciile <span>noastre</span></div>
    <div class="services-grid">
        <a class="service-card" href="/servicii/revizie-auto" style="text-decoration:none;"><h3>Revizie completă</h3><p>Verificare și înlocuire ulei, filtre, lichide, plăcuțe de frână și toate elementele de uzură.</p></a>
        <a class="service-card" href="/servicii/diagnoza-auto" style="text-decoration:none;"><h3>Diagnoză computerizată</h3><p>Citim erorile din calculatorul mașinii și stabilim cauza reală a problemei.</p></a>
        <a class="service-card" href="/servicii/sistem-franare" style="text-decoration:none;"><h3>Sistem de frânare</h3><p>Verificare, reglare și înlocuire componente sistem de frânare.</p></a>
        <a class="service-card" href="/servicii/suspensie-directie" style="text-decoration:none;"><h3>Suspensie și direcție</h3><p>Diagnosticare și reparare probleme de suspensie, geometrie și direcție.</p></a>
    </div>
    <div style="text-align:center;margin-top:1.5rem;"><a href="/servicii" class="btn btn-outline">Vezi toate serviciile</a></div>
  </section>
  <section class="why-section">
    <div class="section-label">De ce noi</div>
    <div class="section-title">${esc(s.home_despre_titlu)}</div>
    <div class="why-grid">
        <div class="why-item"><div class="num">${esc(s.home_ani_experienta)}</div><h3>Ani experiență</h3><p>Pe zeci de mărci și modele.</p></div>
        <div class="why-item"><div class="num">${esc(s.home_clienti)}</div><h3>Clienți mulțumiți</h3><p>Care revin și recomandă.</p></div>
        <div class="why-item"><div class="num">100%</div><h3>Transparență</h3><p>Știi exact ce și cât costă.</p></div>
    </div>
  </section>
  ${(recenzii && recenzii.length) ? `<style>
    .reviews-section{padding:3.5rem 1.5rem;border-bottom:1px solid var(--border);text-align:center;}
    .reviews-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:1.2rem;max-width:1100px;margin:1.5rem auto 0;text-align:left;}
    .review-card{background:var(--dark2);border:1px solid var(--border);border-top:3px solid var(--red);padding:1.5rem;}
    .review-stars{color:#f0a500;letter-spacing:2px;font-size:1.1rem;margin-bottom:0.6rem;}
    .review-card p{color:var(--grey-light);line-height:1.7;font-size:0.95rem;font-style:italic;margin:0 0 1rem;}
    .review-name{font-family:'Barlow Condensed',sans-serif;font-weight:700;letter-spacing:0.5px;color:var(--white);}
  </style>
  <section class="reviews-section">
    <div class="section-label">Părerea clienților</div>
    <div class="section-title">Ce spun <span>clienții</span></div>
    <div class="reviews-grid">
      ${recenzii.map((r) => `<div class="review-card"><div class="review-stars">${stele(r.rating)}</div><p>„${esc(r.text)}"</p><div class="review-name">— ${esc(numeScurt(r.nume))}</div></div>`).join('')}
    </div>
  </section>` : ''}
  <section class="cta-photo"><div class="cta-inner"><div class="cta-box">
    <h2>Mașina ta, pe <span>mâini bune</span></h2>
    <p>Diagnoză, reparații și revizii pentru orice marcă. Programează-te online în câteva minute și lasă restul în grija noastră.</p>
    <div class="hero-btns">${heroBtns}</div>
  </div></div></section>
  <section class="program-section">
    <h2>Program de <span>lucru</span></h2>
    <p>Luni — Vineri</p>
    <p style="font-family:'Barlow Condensed',sans-serif;font-size:1.5rem;font-weight:700;color:var(--white);margin:0.5rem 0 0.5rem;">09:00 — 17:00</p>
    <p style="color:var(--grey);margin-bottom:1.5rem;">Sâmbătă și duminică: închis</p>
    <a href="/contact" class="btn btn-outline">Contactează-ne</a>
  </section>`;
  const ld: Record<string, any> = {
    '@context': 'https://schema.org',
    '@type': 'AutoRepair',
    name: 'APG Garage',
    image: SITE_URL + '/hero.jpg',
    logo: SITE_URL + '/logo.png',
    url: SITE_URL,
    telephone: s.contact_telefon,
    email: s.contact_email,
    address: { '@type': 'PostalAddress', streetAddress: s.contact_adresa, addressLocality: 'București', addressCountry: 'RO' },
    openingHoursSpecification: [{ '@type': 'OpeningHoursSpecification', dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'], opens: '09:00', closes: '17:00' }],
    areaServed: [
      { '@type': 'City', name: 'București' },
      { '@type': 'Place', name: 'Sector 6' },
      { '@type': 'Place', name: 'Militari' },
    ],
    knowsAbout: ['Service auto', 'Mecanică auto', 'Reparații Honda', 'Revizie auto', 'Diagnoză auto'],
    priceRange: '$$',
  };
  const lat = String(s.firma_geo_lat ?? '').trim();
  const lng = String(s.firma_geo_lng ?? '').trim();
  if (lat && lng) ld.geo = { '@type': 'GeoCoordinates', latitude: lat, longitude: lng };
  if (recenzii && recenzii.length) {
    const avg = recenzii.reduce((sum, r) => sum + (Number(r.rating) || 0), 0) / recenzii.length;
    ld.aggregateRating = { '@type': 'AggregateRating', ratingValue: avg.toFixed(1), reviewCount: recenzii.length };
  }
  const jsonLd = `<script type="application/ld+json">${JSON.stringify(ld).replace(/</g, '\\u003c')}</script>`;
  return c.html(page({ title: 'APG Garage — Service Auto București', user, nav: 'public', pagini: c.get('pagini'), path: '/', description: 'Service auto în Militari, Sector 6 și București: revizii, mecanică auto, reparații Honda, diagnoză, frâne și suspensie. Programează-te online la APG Garage.', headExtra: HOME_STYLE, body, bodyEnd: jsonLd }));
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
  if (!paginaActiva(s, 'pagina_despre')) return paginaIndisponibila(c);
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
  return c.html(page({ title: 'Despre noi — APG Garage', user, nav: 'public', pagini: c.get('pagini'), path: '/despre', description: 'Despre APG Garage — echipă cu experiență, lucrări cu garanție și prețuri transparente pentru service auto în București.', headExtra: DESPRE_STYLE, body }));
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
  if (!paginaActiva(await getSetari(c.env), 'pagina_preturi')) return paginaIndisponibila(c);
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
  return c.html(page({ title: 'Prețuri — APG Garage', user, nav: 'public', pagini: c.get('pagini'), path: '/preturi', description: 'Prețuri orientative APG Garage pentru revizii, reparații, frâne și suspensie. Vezi tarifele și programează-te online.', headExtra: PRETURI_STYLE, body }));
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
    <div class="page-subtitle">Scrie-ne, sună-ne sau vino direct la service.</div>
  </section>
  <div class="container" style="padding-top:2.5rem;"><div class="contact-grid">
    <div>
        <div class="section-label">Date de contact</div>
        <div class="section-title">Găsește-<span>ne</span></div>
        <div class="card" style="padding:0 1.2rem;">
            <div class="contact-info-item"><div class="icon">📍</div><div><div class="lbl">Adresă</div><div class="val">${nl2br(s.contact_adresa)}</div></div></div>
            <div class="contact-info-item"><div class="icon">📞</div><div><div class="lbl">Telefon</div><div class="val"><a href="tel:${esc(telClean)}">${esc(s.contact_telefon)}</a></div></div></div>
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
  if (!paginaActiva(s, 'pagina_contact')) return paginaIndisponibila(c);
  return c.html(page({ title: 'Contact — APG Garage', user, nav: 'public', pagini: c.get('pagini'), path: '/contact', description: 'Contact APG Garage — adresă, telefon, program și formular. Sună-ne pentru o programare la service.', headExtra: CONTACT_STYLE, body: contactBody(s, false, '', {}) }));
});

app.post('/contact', async (c) => {
  const user = c.get('user');
  const s = await getSetari(c.env);
  if (!paginaActiva(s, 'pagina_contact')) return paginaIndisponibila(c);
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
    // Salvează mesajul în rubrica „Mesaje" din admin
    await ensureMesaje(c.env);
    await c.env.DB.prepare('INSERT INTO mesaje (nume, email, telefon, mesaj) VALUES (?, ?, ?, ?)').bind(nume, email, telefon, mesaj).run();
    // …și trimite notificarea către admin (cu toggle + jurnal)
    c.executionCtx.waitUntil(notificareMesajContact(c.env, nume, email, telefon, mesaj));
    success = true;
  }
  const vals: Record<string, string> = success ? {} : { nume, email, telefon, mesaj };
  return c.html(page({ title: 'Contact — APG Garage', user, nav: 'public', pagini: c.get('pagini'), path: '/contact', description: 'Contact APG Garage — adresă, telefon, program și formular. Sună-ne pentru o programare la service.', headExtra: CONTACT_STYLE, body: contactBody(s, success, error, vals) }));
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
            <div class="info-item"><div class="icon">🚛</div><div class="text"><strong>3. Trimitem mașina de tractare</strong>Ajungem la locația ta și transportăm vehiculul în siguranță la service.</div></div>
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
  if (s.tractari_activ !== '1') return c.html(page({ title: 'Tractări auto — APG Garage', user, nav: 'public', pagini: c.get('pagini'), path: '/tractari', description: 'Tractări auto București și Ilfov — cere o tractare online la APG Garage. Te contactăm rapid.', headExtra: TRACTARI_STYLE, body: tractariInactiv(s) }));
  return c.html(page({ title: 'Tractări auto — APG Garage', user, nav: 'public', pagini: c.get('pagini'), path: '/tractari', description: 'Tractări auto București și Ilfov — cere o tractare online la APG Garage. Te contactăm rapid.', headExtra: TRACTARI_STYLE, body: tractariBody(user, false, '', {}) }));
});

app.post('/tractari', async (c) => {
  const user = c.get('user');
  const s = await getSetari(c.env);
  if (s.tractari_activ !== '1') return c.html(page({ title: 'Tractări auto — APG Garage', user, nav: 'public', pagini: c.get('pagini'), path: '/tractari', description: 'Tractări auto București și Ilfov — cere o tractare online la APG Garage. Te contactăm rapid.', headExtra: TRACTARI_STYLE, body: tractariInactiv(s) }));
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
    c.executionCtx.waitUntil(notificareCerereTractare(c.env, nume, telefon, locatie, (nr + ' ' + producator + ' ' + model).trim(), descriere));
    success = true;
  }
  const vals: Record<string, string> = success ? {} : { nume, telefon, locatie, nr_inmatriculare: nr, producator, model, descriere_problema: descriere };
  return c.html(page({ title: 'Tractări auto — APG Garage', user, nav: 'public', pagini: c.get('pagini'), path: '/tractari', description: 'Tractări auto București și Ilfov — cere o tractare online la APG Garage. Te contactăm rapid.', headExtra: TRACTARI_STYLE, body: tractariBody(user, success, error, vals) }));
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
  if (s.dezmembrari_activ !== '1') return c.html(page({ title: 'Piese din dezmembrări — APG Garage', user, nav: 'public', pagini: c.get('pagini'), path: '/dezmembrari', description: 'Piese auto din dezmembrări la APG Garage. Vezi mașinile disponibile și cere piesa de care ai nevoie.', headExtra: DEZM_STYLE, body: dezmInactiv(s) }));
  const { results } = await c.env.DB.prepare('SELECT * FROM dezmembrari WHERE activ = 1 ORDER BY producator, model').all<any>();
  const selectedId = parseInt(c.req.query('masina') ?? '0', 10);
  return c.html(page({ title: 'Piese din dezmembrări — APG Garage', user, nav: 'public', pagini: c.get('pagini'), path: '/dezmembrari', description: 'Piese auto din dezmembrări la APG Garage. Vezi mașinile disponibile și cere piesa de care ai nevoie.', headExtra: DEZM_STYLE, body: dezmBody(user, results ?? [], selectedId, false, '', {}), bodyEnd: DEZM_SCRIPT }));
});

app.post('/dezmembrari', async (c) => {
  const user = c.get('user');
  const s = await getSetari(c.env);
  if (s.dezmembrari_activ !== '1') return c.html(page({ title: 'Piese din dezmembrări — APG Garage', user, nav: 'public', pagini: c.get('pagini'), path: '/dezmembrari', description: 'Piese auto din dezmembrări la APG Garage. Vezi mașinile disponibile și cere piesa de care ai nevoie.', headExtra: DEZM_STYLE, body: dezmInactiv(s) }));
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
      c.executionCtx.waitUntil(notificareCererePiesa(c.env, nume, telefon, (m.producator + ' ' + m.model + ' ' + (m.an_fabricatie ?? '')).trim(), piesa));
      success = true;
      selectedId = 0;
    }
  }
  const vals: Record<string, string> = success ? {} : { nume, telefon, piesa_dorita: piesa };
  return c.html(page({ title: 'Piese din dezmembrări — APG Garage', user, nav: 'public', pagini: c.get('pagini'), path: '/dezmembrari', description: 'Piese auto din dezmembrări la APG Garage. Vezi mașinile disponibile și cere piesa de care ai nevoie.', headExtra: DEZM_STYLE, body: dezmBody(user, masini ?? [], selectedId, success, error, vals), bodyEnd: DEZM_SCRIPT }));
});

/* ============================ PAGINI SERVICII (SEO) ============================ */
interface ServiciuSeo {
  slug: string;
  nume: string;
  h1: string;
  meta: string;
  intro: string;
  include: string[];
  extra: string;
}

const SERVICII_SEO: ServiciuSeo[] = [
  {
    slug: 'revizie-auto',
    nume: 'Revizie auto',
    h1: 'Revizie auto în București',
    meta: 'Revizie auto completă în București la APG Garage: schimb ulei și filtre, verificare frâne, suspensie, lichide și elemente de uzură. Programează-te online.',
    intro: 'Revizia periodică este cel mai simplu mod de a-ți menține mașina sigură și fiabilă. La APG Garage facem revizii complete pentru orice marcă și model, cu piese de calitate și verificări amănunțite.',
    include: ['Schimb ulei motor și filtru de ulei', 'Înlocuire filtru aer, filtru polen și filtru combustibil', 'Verificare sistem de frânare și plăcuțe', 'Control suspensie, direcție și geometrie', 'Verificare și completare lichide (răcire, frână, parbriz)', 'Diagnoză computerizată pentru erori'],
    extra: 'Îți recomandăm o revizie la fiecare 10.000–15.000 km sau o dată pe an. După revizie, îți setăm un reminder automat ca să nu pierzi următoarea scadență.',
  },
  {
    slug: 'mecanica-auto',
    nume: 'Mecanică auto',
    h1: 'Service mecanică auto în București',
    meta: 'Service mecanică auto în Militari și Sector 6, București. Reparații mecanice pentru orice marcă — Honda, Toyota, VW, Dacia. Programează-te online la APG Garage.',
    intro: 'De la zgomote suspecte la defecțiuni complexe, ne ocupăm de orice reparație mecanică. Diagnosticăm corect și reparăm durabil, cu piese de calitate, pentru orice marcă și model.',
    include: ['Reparații motor și ambreiaj', 'Distribuție, curele și role', 'Sistem de răcire și termostat', 'Reparații cutie de viteze', 'Înlocuire rulmenți, fuzete și articulații', 'Reparații Honda, Toyota, Volkswagen, BMW, Dacia și alte mărci'],
    extra: 'Indiferent de problemă, îți spunem clar ce trebuie făcut și cât costă, înainte de a începe lucrarea.',
  },
  {
    slug: 'diagnoza-auto',
    nume: 'Diagnoză computerizată',
    h1: 'Diagnoză auto computerizată în București',
    meta: 'Diagnoză auto computerizată în București la APG Garage. Citim erorile din calculatorul mașinii și îți spunem exact ce trebuie reparat. Programează-te online.',
    intro: 'Martorul de bord aprins nu înseamnă mereu o problemă gravă — dar trebuie verificat. Cu tester profesional citim codurile de eroare din toate calculatoarele mașinii și stabilim cauza reală, fără presupuneri.',
    include: ['Citire și ștergere coduri de eroare (OBD)', 'Verificare motor, transmisie, ABS, airbag', 'Analiză parametri în timp real', 'Identificarea cauzei și estimare de cost', 'Raport clar, pe înțelesul tău'],
    extra: 'O diagnoză corectă te scutește de reparații inutile. Îți explicăm exact ce am găsit și ce este sau nu urgent de rezolvat.',
  },
  {
    slug: 'sistem-franare',
    nume: 'Sistem de frânare',
    h1: 'Reparații sistem de frânare în București',
    meta: 'Service frâne în București la APG Garage: înlocuire plăcuțe și discuri, verificare etrieri și lichid de frână. Siguranța ta este prioritatea noastră.',
    intro: 'Frânele sunt cel mai important sistem de siguranță al mașinii. Verificăm și înlocuim componentele uzate cu piese de calitate, ca să frânezi sigur în orice condiții.',
    include: ['Înlocuire plăcuțe și discuri de frână', 'Verificare etrieri și furtune', 'Schimb lichid de frână', 'Verificare frână de mână și ABS', 'Test de frânare după intervenție'],
    extra: 'Dacă auzi scârțâit la frânare sau simți vibrații în pedală, programează-te cât mai repede pentru o verificare.',
  },
  {
    slug: 'suspensie-directie',
    nume: 'Suspensie și direcție',
    h1: 'Reparații suspensie și direcție în București',
    meta: 'Service suspensie și direcție în București la APG Garage: amortizoare, bucșe, articulații, geometrie roți. Confort și siguranță la drum.',
    intro: 'O suspensie în stare bună înseamnă confort, aderență și control. Diagnosticăm și reparăm problemele de suspensie și direcție, apoi reglăm geometria pentru o conducere sigură.',
    include: ['Înlocuire amortizoare și arcuri', 'Schimb bucșe, pivoți și capete de bară', 'Verificare rulmenți roți', 'Reglare geometrie (aliniere) roți', 'Test pe drum după intervenție'],
    extra: 'Zgomotele la trecerea peste denivelări sau uzura neuniformă a anvelopelor sunt semne că suspensia are nevoie de o verificare.',
  },
  {
    slug: 'schimb-ulei',
    nume: 'Schimb ulei și filtre',
    h1: 'Schimb ulei și filtre în București',
    meta: 'Schimb ulei și filtre în București la APG Garage, rapid și cu uleiuri de calitate, potrivite pentru mașina ta. Programează-te online.',
    intro: 'Uleiul curat protejează motorul și îi prelungește viața. Folosim uleiuri și filtre potrivite specificațiilor mașinii tale și efectuăm schimbul rapid și corect.',
    include: ['Schimb ulei motor cu specificația corectă', 'Înlocuire filtru de ulei', 'Verificare nivel lichide', 'Resetare indicator service', 'Verificare scurgeri'],
    extra: 'Îți recomandăm schimbul de ulei la fiecare 10.000–15.000 km sau anual, în funcție de tipul de ulei și de utilizarea mașinii.',
  },
  {
    slug: 'verificare-rampa',
    nume: 'Verificare rampă',
    h1: 'Verificare rampă auto în București',
    meta: 'Verificare pe rampă în București la APG Garage înainte de ITP sau de un drum lung. Verificăm dedesubtul mașinii și îți spunem ce trebuie reparat.',
    intro: 'O verificare pe rampă îți arată starea reală a mașinii dedesubt — util înainte de ITP, înaintea unui drum lung sau la achiziția unei mașini second-hand.',
    include: ['Inspecție vizuală a șasiului și caroseriei', 'Verificare sistem de evacuare', 'Control suspensie, direcție și frâne', 'Identificare scurgeri și coroziune', 'Recomandări clare pentru ITP'],
    extra: 'Îți setăm și un reminder automat pentru următoarea verificare, la intervalul stabilit împreună.',
  },
];

export const SERVICII_SLUGS = SERVICII_SEO.map((s) => s.slug);

function serviciuJsonLd(sv: ServiciuSeo): string {
  const data = {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: sv.nume,
    serviceType: sv.nume,
    areaServed: [
      { '@type': 'City', name: 'București' },
      { '@type': 'Place', name: 'Sector 6' },
      { '@type': 'Place', name: 'Militari' },
    ],
    provider: { '@type': 'AutoRepair', name: 'APG Garage', url: SITE_URL, telephone: '' },
    url: `${SITE_URL}/servicii/${sv.slug}`,
  };
  const bc = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Acasă', item: SITE_URL + '/' },
      { '@type': 'ListItem', position: 2, name: 'Servicii', item: SITE_URL + '/servicii' },
      { '@type': 'ListItem', position: 3, name: sv.nume, item: `${SITE_URL}/servicii/${sv.slug}` },
    ],
  };
  return `<script type="application/ld+json">${JSON.stringify(data).replace(/</g, '\\u003c')}</script><script type="application/ld+json">${JSON.stringify(bc).replace(/</g, '\\u003c')}</script>`;
}

const SERVICII_STYLE = `<style>
    ${HERO_SMALL}
    .sv-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:1.2rem; }
    @media(max-width:760px){ .sv-grid { grid-template-columns:1fr; } }
    .sv-card { background:var(--dark2); border:1px solid var(--border); border-top:3px solid var(--red); padding:1.5rem; text-decoration:none; display:block; transition:border-color .15s,transform .15s; }
    .sv-card:hover { border-top-color:var(--white); transform:translateY(-3px); }
    .sv-card h3 { font-family:'Barlow Condensed',sans-serif; font-size:1.2rem; font-weight:700; text-transform:uppercase; letter-spacing:1px; color:var(--white); margin-bottom:0.5rem; }
    .sv-card p { color:var(--grey); font-size:0.9rem; line-height:1.6; }
    .sv-card .more { color:var(--red); font-size:0.82rem; font-weight:700; letter-spacing:1px; text-transform:uppercase; margin-top:0.8rem; display:inline-block; }
    .breadcrumb { font-size:0.8rem; color:var(--grey); margin-bottom:1.2rem; }
    .breadcrumb a { color:var(--grey-light); text-decoration:none; } .breadcrumb a:hover { color:var(--red); }
    .sv-detail { display:grid; grid-template-columns:1.5fr 1fr; gap:2.5rem; align-items:start; }
    @media(max-width:760px){ .sv-detail { grid-template-columns:1fr; } }
    .sv-detail .lead { color:var(--grey-light); line-height:1.8; font-size:1rem; margin-bottom:1.5rem; }
    .sv-include { list-style:none; padding:0; margin:0; }
    .sv-include li { padding:0.6rem 0 0.6rem 1.8rem; border-bottom:1px solid var(--border); position:relative; color:var(--grey-light); font-size:0.93rem; }
    .sv-include li::before { content:'✓'; position:absolute; left:0; color:var(--red); font-weight:800; }
    .sv-aside { background:var(--dark2); border:1px solid var(--border); padding:1.5rem; }
    .sv-aside h3 { font-family:'Barlow Condensed',sans-serif; font-size:1.05rem; text-transform:uppercase; letter-spacing:1px; margin-bottom:0.8rem; }
    .sv-aside .other a { display:block; color:var(--grey-light); text-decoration:none; padding:0.4rem 0; border-bottom:1px solid var(--border); font-size:0.9rem; }
    .sv-aside .other a:hover { color:var(--red); }
</style>`;

app.get('/servicii', async (c) => {
  const cards = SERVICII_SEO.map((sv) => `<a href="/servicii/${sv.slug}" class="sv-card"><h3>${esc(sv.nume)}</h3><p>${esc(sv.intro.slice(0, 110))}…</p><span class="more">Detalii →</span></a>`).join('');
  const body = `<section class="hero-small"><div class="section-label">Ce facem</div>
    <div class="page-title">Serviciile <span>noastre</span></div>
    <div class="page-subtitle">Service auto complet în București — alege serviciul de care ai nevoie</div></section>
    <div class="container" style="padding-top:2.5rem;"><div class="sv-grid">${cards}</div>
    <div class="cta-box" style="text-align:center;padding:2.5rem 1.5rem;background:var(--dark2);border:1px solid var(--border);margin-top:2.5rem;">
      <div class="section-title">Gata să <span>programezi</span>?</div>
      <p style="color:var(--grey);margin-bottom:1.5rem;">Fă o programare online în câteva minute.</p>
      <a href="/rezervare" class="btn btn-primary">Programează-te</a> <a href="/contact" class="btn btn-outline">Contact</a>
    </div></div>`;
  return c.html(page({ title: 'Servicii auto București — APG Garage', user: c.get('user'), nav: 'public', pagini: c.get('pagini'), path: '/servicii', description: 'Servicii auto complete în București la APG Garage: revizii, diagnoză, frâne, suspensie, schimb ulei și verificare rampă.', headExtra: SERVICII_STYLE, body }));
});

app.get('/servicii/:slug', async (c) => {
  const sv = SERVICII_SEO.find((x) => x.slug === c.req.param('slug'));
  if (!sv) return c.notFound();
  const altele = SERVICII_SEO.filter((x) => x.slug !== sv.slug).slice(0, 5);
  const body = `<section class="hero-small">
    <div class="breadcrumb"><a href="/">Acasă</a> / <a href="/servicii">Servicii</a> / ${esc(sv.nume)}</div>
    <div class="section-label">Service auto București</div>
    <h1 class="page-title">${esc(sv.h1.replace('în București', ''))}<span>${sv.h1.includes('București') ? ' în București' : ''}</span></h1>
  </section>
  <div class="container" style="padding-top:2.5rem;"><div class="sv-detail">
    <div>
      <p class="lead">${esc(sv.intro)}</p>
      <div class="section-label">Ce include</div>
      <ul class="sv-include">${sv.include.map((i) => `<li>${esc(i)}</li>`).join('')}</ul>
      <p style="color:var(--grey-light);line-height:1.8;margin-top:1.5rem;">${esc(sv.extra)}</p>
      <div style="margin-top:2rem;"><a href="/rezervare" class="btn btn-primary">Programează-te online</a> <a href="/contact" class="btn btn-outline">Întreabă-ne</a></div>
    </div>
    <aside class="sv-aside">
      <h3>Alte servicii</h3>
      <div class="other">${altele.map((x) => `<a href="/servicii/${x.slug}">${esc(x.nume)}</a>`).join('')}</div>
      <div style="margin-top:1.2rem;font-size:0.85rem;color:var(--grey);line-height:1.6;">Service auto în București pentru orice marcă. Programări online, prețuri transparente, lucrări cu garanție.</div>
    </aside>
  </div></div>`;
  return c.html(page({ title: `${sv.nume} București — APG Garage`, user: c.get('user'), nav: 'public', pagini: c.get('pagini'), path: `/servicii/${sv.slug}`, description: sv.meta, headExtra: SERVICII_STYLE, body, bodyEnd: serviciuJsonLd(sv) }));
});

/* ============================ PAGINI LEGALE ============================ */
const LEGAL_STYLE = `<style>
    ${HERO_SMALL}
    .legal-wrap { max-width:820px; margin:0 auto; padding:2.5rem 1.5rem 4rem; }
    .legal-wrap h2 { font-family:'Barlow Condensed',sans-serif; font-size:1.4rem; font-weight:700; text-transform:uppercase; letter-spacing:1px; margin:2rem 0 0.8rem; color:var(--white); }
    .legal-wrap h2:first-child { margin-top:0; }
    .legal-wrap p, .legal-wrap li { color:var(--grey-light); line-height:1.8; font-size:0.95rem; }
    .legal-wrap ul { margin:0.5rem 0 1rem 1.2rem; }
    .legal-wrap a { color:var(--red); }
    .legal-meta { color:var(--grey); font-size:0.82rem; margin-bottom:1.5rem; }
</style>`;

function legalIdent(s: Record<string, string>): string {
  const rows = [
    ['Denumire', 'APG Garage'],
    ['Adresă', s.contact_adresa],
    ['Email', s.contact_email],
    ['Telefon', s.contact_telefon],
    ['CUI / CIF', s.firma_cui],
    ['Reg. Comerțului', s.firma_reg_com],
  ].filter(([, v]) => v && String(v).trim());
  return `<ul>${rows.map(([k, v]) => `<li><strong style="color:var(--white)">${k}:</strong> ${esc(String(v))}</li>`).join('')}</ul>`;
}

function legalPage(title: string, subtitlu: string, continut: string): string {
  return `<section class="hero-small"><div class="section-label">Informații</div>
    <div class="page-title">${title}</div>
    <div class="page-subtitle">${subtitlu}</div></section>
    <div class="legal-wrap"><div class="legal-meta">Ultima actualizare: ${new Date().toLocaleDateString('ro-RO')}</div>${continut}</div>`;
}

app.get('/confidentialitate', async (c) => {
  const s = await getSetari(c.env);
  const continut = `
    <p>Această politică explică modul în care APG Garage colectează, folosește și protejează datele tale cu caracter personal, în conformitate cu Regulamentul (UE) 2016/679 (GDPR).</p>
    <h2>Operatorul datelor</h2>
    ${legalIdent(s)}
    <h2>Ce date colectăm</h2>
    <ul>
      <li>Date de identificare și contact: nume, email, telefon;</li>
      <li>Date despre vehicul: număr de înmatriculare, marcă, model, istoric service;</li>
      <li>Conținutul mesajelor trimise prin formularul de contact;</li>
      <li>Date tehnice strict necesare funcționării site-ului (cookie-uri).</li>
    </ul>
    <h2>Scopul prelucrării</h2>
    <ul>
      <li>Crearea și administrarea contului tău;</li>
      <li>Programarea și efectuarea serviciilor auto, emiterea devizelor;</li>
      <li>Trimiterea de notificări legate de programări și reminder-e (revizie, verificare rampă);</li>
      <li>Răspunsul la solicitările transmise prin formularul de contact.</li>
    </ul>
    <h2>Temeiul legal</h2>
    <p>Prelucrarea se bazează pe executarea contractului de prestări servicii, pe consimțământul tău (acolo unde este cazul) și pe interesul legitim al operatorului.</p>
    <h2>Durata de stocare</h2>
    <p>Păstrăm datele atât timp cât ai cont activ și ulterior pe durata impusă de obligațiile legale (ex. fiscale).</p>
    <h2>Drepturile tale</h2>
    <p>Ai dreptul de acces, rectificare, ștergere, restricționare, portabilitate și opoziție, precum și dreptul de a-ți retrage consimțământul. Pentru exercitarea lor, ne poți contacta la <a href="mailto:${esc(s.contact_email)}">${esc(s.contact_email)}</a>. De asemenea, te poți adresa Autorității Naționale de Supraveghere a Prelucrării Datelor cu Caracter Personal (ANSPDCP).</p>
    <h2>Persoane împuternicite</h2>
    <p>Pentru trimiterea emailurilor folosim furnizori de servicii de email (Google / Resend). Datele sunt transmise strict în scopul livrării notificărilor.</p>`;
  return c.html(page({ title: 'Politica de confidențialitate — APG Garage', user: c.get('user'), nav: 'public', pagini: c.get('pagini'), path: '/confidentialitate', description: 'Politica de confidențialitate APG Garage — cum colectăm și protejăm datele tale personale (GDPR).', headExtra: LEGAL_STYLE, body: legalPage('Politica de <span>confidențialitate</span>', 'Protecția datelor tale personale (GDPR)', continut) }));
});

app.get('/termeni', async (c) => {
  const s = await getSetari(c.env);
  const continut = `
    <p>Prin utilizarea site-ului apg-garage.ro și a serviciilor oferite, ești de acord cu termenii de mai jos.</p>
    <h2>Prestatorul serviciilor</h2>
    ${legalIdent(s)}
    <h2>Servicii</h2>
    <p>APG Garage oferă servicii de revizii, reparații mecanice, diagnoză, verificare rampă, tractări și piese din dezmembrări. Programările făcute online au caracter de solicitare și sunt confirmate de service.</p>
    <h2>Programări</h2>
    <ul>
      <li>O programare devine fermă după confirmarea din partea service-ului;</li>
      <li>Te rugăm să anunți din timp dacă nu mai poți ajunge la o programare;</li>
      <li>Devizul comunicat are caracter estimativ și poate fi ajustat în funcție de constatările la fața locului, cu acordul tău.</li>
    </ul>
    <h2>Obligațiile clientului</h2>
    <p>Te obligi să furnizezi informații corecte despre vehicul și date de contact valide.</p>
    <h2>Prețuri și plată</h2>
    <p>Prețurile afișate sunt orientative. Prețul final se stabilește prin deviz, înainte de începerea lucrării.</p>
    <h2>Soluționarea litigiilor</h2>
    <p>Eventualele neînțelegeri se rezolvă pe cale amiabilă. Te poți adresa și platformei ANPC – SOL: <a href="https://ec.europa.eu/consumers/odr" target="_blank" rel="noopener nofollow">ec.europa.eu/consumers/odr</a>, respectiv SAL: <a href="https://anpc.ro/ce-este-sal/" target="_blank" rel="noopener nofollow">anpc.ro/ce-este-sal</a>.</p>`;
  return c.html(page({ title: 'Termeni și condiții — APG Garage', user: c.get('user'), nav: 'public', pagini: c.get('pagini'), path: '/termeni', description: 'Termenii și condițiile de utilizare a serviciilor APG Garage.', headExtra: LEGAL_STYLE, body: legalPage('Termeni și <span>condiții</span>', 'Condițiile de utilizare a serviciilor', continut) }));
});

app.get('/cookies', async (c) => {
  const continut = `
    <p>Site-ul apg-garage.ro folosește cookie-uri pentru a funcționa corect și pentru a îmbunătăți experiența ta.</p>
    <h2>Ce sunt cookie-urile</h2>
    <p>Cookie-urile sunt fișiere mici stocate în browser care permit site-ului să rețină anumite informații (ex. sesiunea de autentificare).</p>
    <h2>Ce cookie-uri folosim</h2>
    <ul>
      <li><strong style="color:var(--white)">Cookie-uri strict necesare:</strong> pentru autentificare și funcționarea sigură a contului (sesiune). Fără ele site-ul nu funcționează corect.</li>
      <li><strong style="color:var(--white)">Preferințe:</strong> rețin acceptul tău pentru această notificare.</li>
    </ul>
    <p>Nu folosim cookie-uri de publicitate sau de urmărire de la terți.</p>
    <h2>Controlul cookie-urilor</h2>
    <p>Poți șterge sau bloca cookie-urile din setările browserului. Dezactivarea celor strict necesare poate afecta funcționarea site-ului.</p>`;
  return c.html(page({ title: 'Politica de cookie-uri — APG Garage', user: c.get('user'), nav: 'public', pagini: c.get('pagini'), path: '/cookies', description: 'Politica de cookie-uri APG Garage.', headExtra: LEGAL_STYLE, body: legalPage('Politica de <span>cookie-uri</span>', 'Cum folosim cookie-urile', continut) }));
});

/* ============================ RECENZIE CLIENT (din email) ============================ */
const RECENZIE_STYLE = `<style>
    ${HERO_SMALL}
    .rec-wrap { max-width:560px; margin:0 auto; padding:2.5rem 1.5rem 4rem; }
    .stars-input { display:inline-flex; flex-direction:row-reverse; gap:6px; }
    .stars-input input { display:none; }
    .stars-input label { font-size:2.4rem; color:#3a3a3a; cursor:pointer; transition:color .12s; line-height:1; }
    .stars-input label:hover, .stars-input label:hover ~ label,
    .stars-input input:checked + label, .stars-input input:checked + label ~ label { color:#f0a500; }
</style>`;

app.get('/recenzie', async (c) => {
  const rid = parseInt(c.req.query('rid') ?? '0', 10);
  const t = c.req.query('t') ?? '';
  const ok = c.req.query('ok') !== undefined;
  const valid = rid && (await verifyReviewToken(c.env, rid, t));

  let inner: string;
  if (!valid) {
    inner = `<div class="rec-wrap" style="text-align:center;"><p style="color:var(--grey);">Link invalid sau expirat. Dacă vrei să ne lași o părere, contactează-ne direct.</p><a href="/" class="btn btn-primary">Acasă</a></div>`;
  } else if (ok) {
    inner = `<div class="rec-wrap" style="text-align:center;">
      <div style="font-size:3rem;margin-bottom:0.5rem;">✓</div>
      <h2 style="font-family:'Barlow Condensed',sans-serif;text-transform:uppercase;letter-spacing:1px;">Mulțumim!</h2>
      <p style="color:var(--grey-light);line-height:1.7;">Recenzia ta a fost trimisă și va fi publicată după o scurtă verificare. Îți mulțumim că ne-ai ajutat!</p>
      <a href="/" class="btn btn-primary">Înapoi la site</a></div>`;
  } else {
    const rez = await c.env.DB.prepare('SELECT u.nume FROM rezervari r JOIN users u ON u.id = r.user_id WHERE r.id = ?').bind(rid).first<any>();
    const nume = rez?.nume ?? '';
    inner = `<div class="rec-wrap">
      <form method="POST" action="/recenzie">
        <input type="hidden" name="rid" value="${rid}"><input type="hidden" name="t" value="${esc(t)}">
        <div class="form-group"><label>Numele tău</label><input type="text" name="nume" value="${esc(nume)}" required></div>
        <div class="form-group"><label>Rating</label><br>
          <div class="stars-input">
            <input type="radio" id="s5" name="rating" value="5" checked><label for="s5">★</label>
            <input type="radio" id="s4" name="rating" value="4"><label for="s4">★</label>
            <input type="radio" id="s3" name="rating" value="3"><label for="s3">★</label>
            <input type="radio" id="s2" name="rating" value="2"><label for="s2">★</label>
            <input type="radio" id="s1" name="rating" value="1"><label for="s1">★</label>
          </div>
        </div>
        <div class="form-group"><label>Părerea ta</label><textarea name="text" rows="5" placeholder="Cum a fost experiența la APG Garage?" required></textarea></div>
        <button type="submit" class="btn btn-primary" style="width:100%;">Trimite recenzia</button>
      </form>
    </div>`;
  }
  const body = `<section class="hero-small"><div class="section-label">Părerea ta contează</div>
    <div class="page-title">Lasă o <span>recenzie</span></div>
    <div class="page-subtitle">Spune-ne cum a fost experiența ta la APG Garage</div></section>${inner}`;
  return c.html(page({ title: 'Lasă o recenzie — APG Garage', user: c.get('user'), nav: 'public', pagini: c.get('pagini'), robots: 'noindex, nofollow', headExtra: RECENZIE_STYLE, body }));
});

app.post('/recenzie', async (c) => {
  const form = await c.req.formData();
  const rid = parseInt(String(form.get('rid') ?? '0'), 10);
  const t = String(form.get('t') ?? '');
  if (!rid || !(await verifyReviewToken(c.env, rid, t))) return c.redirect('/');
  const nume = String(form.get('nume') ?? '').trim().slice(0, 80);
  const text = String(form.get('text') ?? '').trim().slice(0, 1000);
  const rating = Math.max(1, Math.min(5, parseInt(String(form.get('rating') ?? '5'), 10) || 5));
  if (nume && text) {
    await ensureRecenzii(c.env);
    // activ = 0: recenzia așteaptă aprobarea adminului înainte de publicare
    await c.env.DB.prepare('INSERT INTO recenzii (nume, rating, text, activ, ordine) VALUES (?, ?, ?, 0, 0)').bind(nume, rating, text).run();
  }
  return c.redirect(`/recenzie?rid=${rid}&t=${encodeURIComponent(t)}&ok=1`);
});

export default app;
