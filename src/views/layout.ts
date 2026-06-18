import { html, raw } from 'hono/html';
import type { SessionUser } from '../types';
import { isSuperAdmin } from '../lib/permisiuni';
import { anCurent, esc } from '../lib/format';

// Domeniul canonic folosit pentru SEO (canonical, Open Graph, sitemap).
// La trecerea pe domeniul propriu, schimbă-l aici și în wrangler.toml (BASE_URL).
export const SITE_URL = 'https://apg-garage.ro';
const DEFAULT_DESC = 'APG Garage — service auto în București: revizii, reparații mecanice, diagnoză, tractări și piese din dezmembrări. Programează-te online rapid.';

const HEAD_META = `
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="theme-color" content="#0a0a0a">
    <meta name="apple-mobile-web-app-capable" content="yes">
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
    <meta name="apple-mobile-web-app-title" content="APG Garage">
    <link rel="manifest" href="/manifest.json">
    <link rel="icon" href="/logo.png">
    <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png">
    <script>if("serviceWorker"in navigator){window.addEventListener("load",function(){navigator.serviceWorker.register("/sw.js");});}</script>
    <link rel="stylesheet" href="/css/style.css">`;

export interface PageOpts {
  title: string;
  user: SessionUser | null;
  body: string;
  headExtra?: string; // <style> sau alte taguri, HTML brut
  nav?: 'public' | 'admin' | 'none';
  currentPath?: string;
  bodyEnd?: string; // script-uri la finalul body, HTML brut
  description?: string; // meta description (SEO)
  path?: string; // calea curentă pentru canonical (ex: '/preturi')
  robots?: string; // ex: 'noindex, nofollow' pentru paginile private
  ogImage?: string; // cale imagine social (implicit /hero.jpg)
  pagini?: Record<string, boolean>; // vizibilitate linkuri meniu public
}

export function page(opts: PageOpts): string {
  const nav = opts.nav ?? 'public';
  const navHtml = nav === 'admin' ? navAdmin(opts.user, opts.currentPath ?? '') : nav === 'public' ? navPublic(opts.user, opts.pagini) : '';
  // Footer-ul (bogat, cu date firmă) este injectat din middleware pe paginile
  // publice, fiindcă are nevoie de setări. Pe admin nu apare footer.
  const footer = '';
  const desc = opts.description ?? DEFAULT_DESC;
  const canonical = SITE_URL + (opts.path ?? '');
  const ogImg = SITE_URL + (opts.ogImage ?? '/hero.jpg');
  const robots = opts.robots ?? (nav === 'admin' ? 'noindex, nofollow' : 'index, follow');
  const seo = `
    <meta name="description" content="${esc(desc)}">
    <meta name="robots" content="${robots}">
    <link rel="canonical" href="${esc(canonical)}">
    <meta property="og:type" content="website">
    <meta property="og:site_name" content="APG Garage">
    <meta property="og:locale" content="ro_RO">
    <meta property="og:title" content="${esc(opts.title)}">
    <meta property="og:description" content="${esc(desc)}">
    <meta property="og:url" content="${esc(canonical)}">
    <meta property="og:image" content="${esc(ogImg)}">
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${esc(opts.title)}">
    <meta name="twitter:description" content="${esc(desc)}">
    <meta name="twitter:image" content="${esc(ogImg)}">`;
  return `<!DOCTYPE html>
<html lang="ro">
<head>
${HEAD_META}
    <title>${opts.title}</title>${seo}
${opts.headExtra ?? ''}
</head>
<body>
${navHtml}
${opts.body}
${footer}
${opts.bodyEnd ?? ''}
</body>
</html>`;
}

// Footer bogat cu rubrici SEO + date legale ale firmei (injectat pe paginile publice).
export function siteFooter(s: Record<string, string>): string {
  const tel = String(s.contact_telefon ?? '').trim();
  const telHref = tel.replace(/[^\d+]/g, '');
  const email = String(s.contact_email ?? '').trim();
  const adresa = String(s.contact_adresa ?? '').trim();
  const cui = String(s.firma_cui ?? '').trim();
  const reg = String(s.firma_reg_com ?? '').trim();
  const servicii = [
    ['/servicii/revizie-auto', 'Revizie auto'],
    ['/servicii/mecanica-auto', 'Mecanică auto'],
    ['/servicii/diagnoza-auto', 'Diagnoză computerizată'],
    ['/servicii/sistem-franare', 'Sistem de frânare'],
    ['/servicii/suspensie-directie', 'Suspensie și direcție'],
    ['/servicii/verificare-rampa', 'Verificare rampă'],
  ];
  return `<footer class="site-footer">
    <div class="footer-grid">
      <div class="footer-col">
        <div class="footer-brand">APG <span>Garage</span></div>
        <p>Service auto în Militari, Sector 6 și București. Revizii, mecanică auto, diagnoză și reparații pentru orice marcă.</p>
        ${tel ? `<p style="margin-top:0.6rem;"><a href="tel:${esc(telHref)}">${esc(tel)}</a></p>` : ''}
      </div>
      <div class="footer-col">
        <h4>Servicii</h4>
        ${servicii.map(([u, t]) => `<a href="${u}">${esc(t)}</a>`).join('')}
      </div>
      <div class="footer-col">
        <h4>Zone & specializări</h4>
        <p>Service auto Militari · Service auto Sector 6 · Service auto București.</p>
        <p style="margin-top:0.5rem;">Reparații Honda, Toyota, Volkswagen, BMW, Dacia și orice marcă.</p>
      </div>
      <div class="footer-col">
        <h4>Date firmă</h4>
        <ul class="footer-firma">
          <li>APG Garage</li>
          ${adresa ? `<li>${esc(adresa)}</li>` : ''}
          ${cui ? `<li>CUI: ${esc(cui)}</li>` : ''}
          ${reg ? `<li>${esc(reg)}</li>` : ''}
          ${email ? `<li><a href="mailto:${esc(email)}">${esc(email)}</a></li>` : ''}
        </ul>
        <div class="footer-legal-links">
          <a href="/confidentialitate">Confidențialitate</a>
          <a href="/termeni">Termeni</a>
          <a href="/cookies">Cookies</a>
          <a href="https://anpc.ro/ce-este-sal/" target="_blank" rel="noopener nofollow">ANPC SAL</a>
          <a href="https://ec.europa.eu/consumers/odr" target="_blank" rel="noopener nofollow">ANPC SOL</a>
        </div>
      </div>
    </div>
    <div class="footer-bottom">© ${anCurent()} APG Garage · Service auto București. Toate drepturile rezervate.</div>
  </footer>`;
}

// Port din src/views/nav.php (URL-uri curate)
export function navPublic(user: SessionUser | null, pagini?: Record<string, boolean>): string {
  const vis = (key: string) => !pagini || pagini[key] !== false;
  const pubLinks = `<a href="/servicii">Servicii</a>${vis('despre') ? '<a href="/despre">Despre noi</a>' : ''}${vis('preturi') ? '<a href="/preturi">Prețuri</a>' : ''}${vis('tractari') ? '<a href="/tractari">Tractări</a>' : ''}${vis('dezmembrari') ? '<a href="/dezmembrari">Dezmembrări</a>' : ''}${vis('contact') ? '<a href="/contact">Contact</a>' : ''}`;
  const pubMobile = `<a href="/servicii">Servicii</a>${vis('despre') ? '<a href="/despre">Despre noi</a>' : ''}${vis('preturi') ? '<a href="/preturi">Prețuri</a>' : ''}${vis('tractari') ? '<a href="/tractari">Tractări auto</a>' : ''}${vis('dezmembrari') ? '<a href="/dezmembrari">Piese dezmembrări</a>' : ''}${vis('contact') ? '<a href="/contact">Contact</a>' : ''}`;
  let links = '';
  let mobile = '';
  if (user) {
    if (user.rol === 'angajat') {
      links = `<a href="/admin">Admin</a><a href="/logout">Ieșire</a>`;
      mobile = `<a href="/admin">Admin</a><a href="/logout">Ieșire</a>`;
    } else {
      links = `<a href="/dashboard">Programările mele</a><a href="/masini">Mașinile mele</a><a href="/rezervare" class="btn btn-primary" style="padding:0.4rem 1.2rem;">Programare</a><a href="/logout">Ieșire</a>`;
      mobile = `<a href="/dashboard">Programările mele</a><a href="/masini">Mașinile mele</a><a href="/logout">Ieșire</a><a href="/rezervare" class="btn-mobile">Fă o programare</a>`;
    }
  } else {
    links = `<a href="/login">Autentificare</a><a href="/register" class="btn btn-primary" style="padding:0.4rem 1.2rem;">Cont nou</a>`;
    mobile = `<a href="/login">Autentificare</a><a href="/register" class="btn-mobile">Programează-te</a>`;
  }

  return `<nav>
    <a href="/" class="nav-logo" style="display:inline-flex;align-items:center;gap:0.6rem;"><img src="/logo.png" alt="A.P.G. Active shop" style="height:46px;width:auto;display:block;"><span>APG <span>Garage</span></span></a>
    <div class="nav-links">
        ${pubLinks}
        ${links}
    </div>
    <button class="hamburger" id="hamburger" aria-label="Meniu" aria-expanded="false"><span></span><span></span><span></span></button>
</nav>
<div class="mobile-menu" id="mobile-menu" aria-hidden="true">
    <a href="/">Acasă</a>
    ${pubMobile}
    ${mobile}
</div>
<script>
(function(){var b=document.getElementById('hamburger'),m=document.getElementById('mobile-menu');if(!b||!m)return;b.addEventListener('click',function(){var o=m.classList.toggle('open');b.classList.toggle('open',o);b.setAttribute('aria-expanded',o);m.setAttribute('aria-hidden',!o);document.body.style.overflow=o?'hidden':'';});m.querySelectorAll('a').forEach(function(l){l.addEventListener('click',function(){m.classList.remove('open');b.classList.remove('open');document.body.style.overflow='';});});window.addEventListener('resize',function(){if(window.innerWidth>768){m.classList.remove('open');b.classList.remove('open');document.body.style.overflow='';}});})();
</script>`;
}

// Port din src/views/nav_admin.php
export function navAdmin(user: SessionUser | null, current: string): string {
  const perm = user?.perms ?? [];
  const has = (p: string) => perm.includes(p);
  const isSuper = isSuperAdmin(user);
  const act = (paths: string[], cls = 'active') => (paths.includes(current) ? cls : '');
  const a = (path: string, label: string) => `<a href="${path}" class="${current === path ? 'active' : ''}">${label}</a>`;

  let groups = '';
  let mobile = '';

  if (has('programari')) {
    groups += `<div class="nav-dropdown"><button class="nav-dropdown-btn ${act(['/admin', '/admin/zi', '/admin/blocare'])}">Programări <span class="arrow">▾</span></button><div class="nav-dropdown-menu">${a('/admin', 'Toate programările')}${a('/admin/zi', 'Programul zilei')}${a('/admin/blocare', 'Zile blocate')}</div></div>`;
    mobile += `<div class="admin-mob-group">Programări</div><a href="/admin">Toate programările</a><a href="/admin/zi">Programul zilei</a><a href="/admin/blocare">Zile blocate</a>`;
  }
  if (has('servicii')) {
    groups += `<div class="nav-dropdown"><button class="nav-dropdown-btn ${act(['/admin/servicii', '/admin/preturi'])}">Servicii <span class="arrow">▾</span></button><div class="nav-dropdown-menu">${a('/admin/servicii', 'Gestionare servicii')}${a('/admin/preturi', 'Prețuri')}</div></div>`;
    mobile += `<div class="admin-mob-group">Servicii</div><a href="/admin/servicii">Gestionare servicii</a><a href="/admin/preturi">Prețuri</a>`;
  }
  if (has('tractari')) {
    groups += `<div class="nav-dropdown"><button class="nav-dropdown-btn ${act(['/admin/tractari'])}">Tractări <span class="arrow">▾</span></button><div class="nav-dropdown-menu">${a('/admin/tractari', 'Cereri tractare')}</div></div>`;
    mobile += `<div class="admin-mob-group">Tractări</div><a href="/admin/tractari">Cereri tractare</a>`;
  }
  if (has('dezmembrari')) {
    groups += `<div class="nav-dropdown"><button class="nav-dropdown-btn ${act(['/admin/dezmembrari', '/admin/cereri-piese'])}">Dezmembrări <span class="arrow">▾</span></button><div class="nav-dropdown-menu">${a('/admin/dezmembrari', 'Mașini dezmembrate')}${a('/admin/cereri-piese', 'Cereri piese')}</div></div>`;
    mobile += `<div class="admin-mob-group">Dezmembrări</div><a href="/admin/dezmembrari">Mașini dezmembrate</a><a href="/admin/cereri-piese">Cereri piese</a>`;
  }
  if (isSuper) {
    groups += `<div class="nav-dropdown"><a href="/admin/mesaje" class="nav-dropdown-btn ${current === '/admin/mesaje' ? 'active' : ''}" id="nav-mesaje" style="text-decoration:none;">Mesaje</a></div>`;
    groups += `<div class="nav-dropdown"><button class="nav-dropdown-btn ${act(['/admin/statistici', '/admin/clienti', '/admin/angajati', '/admin/notificari', '/admin/recenzii', '/admin/setari', '/admin/contact', '/admin/continut'])}">Admin <span class="arrow">▾</span></button><div class="nav-dropdown-menu">${a('/admin/statistici', 'Statistici')}${a('/admin/clienti', 'Clienți')}${a('/admin/angajati', 'Angajați & Permisiuni')}${a('/admin/recenzii', 'Recenzii')}${a('/admin/notificari', 'Notificări')}${a('/admin/setari', 'Setări site')}${a('/admin/contact', 'Date contact')}${a('/admin/continut', 'Conținut site')}</div></div>`;
    mobile += `<a href="/admin/mesaje">Mesaje</a>`;
    mobile += `<div class="admin-mob-group">Administrare</div><a href="/admin/statistici">Statistici</a><a href="/admin/clienti">Clienți</a><a href="/admin/angajati">Angajați & Permisiuni</a><a href="/admin/recenzii">Recenzii</a><a href="/admin/notificari">Notificări</a><a href="/admin/setari">Setări site</a><a href="/admin/contact">Date contact</a><a href="/admin/continut">Conținut site</a>`;
  }

  return `<nav id="admin-nav">
    <a href="/admin" class="nav-logo" style="display:inline-flex;align-items:center;gap:0.6rem;"><img src="/logo.png" alt="A.P.G. Active shop" style="height:42px;width:auto;display:block;"><span>APG <span>Garage</span> <span style="font-size:0.7rem;color:#555;letter-spacing:1px;font-weight:400;">ADMIN</span></span></a>
    <div class="nav-links" id="admin-nav-links">
        ${groups}
        <a href="/" style="color:var(--grey);font-size:0.85rem;letter-spacing:1px;text-transform:uppercase;">Site</a>
        <a href="/logout" style="color:var(--grey);font-size:0.85rem;letter-spacing:1px;text-transform:uppercase;">Ieșire</a>
    </div>
    <button class="hamburger" id="admin-hamburger" aria-label="Meniu"><span></span><span></span><span></span></button>
</nav>
<div class="mobile-menu" id="admin-mobile-menu">
    ${mobile}
    <div style="margin-top:1rem;border-top:1px solid var(--border);padding-top:0.8rem;"><a href="/">Site public</a><a href="/logout">Ieșire</a></div>
</div>
<style>
#admin-nav { background: var(--black); border-bottom: 2px solid var(--red); padding: 0 1.5rem; display: flex; align-items: center; justify-content: space-between; height: 64px; position: sticky; top: 0; z-index: 200; }
.nav-dropdown { position: relative; }
.nav-dropdown-btn { background: none; border: none; color: var(--grey-light); font-family: 'Barlow', sans-serif; font-size: 0.88rem; font-weight: 500; letter-spacing: 1px; text-transform: uppercase; cursor: pointer; padding: 0.3rem 0; display: flex; align-items: center; gap: 0.3rem; transition: color 0.2s; white-space: nowrap; }
.nav-dropdown-btn:hover, .nav-dropdown-btn.active { color: var(--red); }
.nav-dropdown-btn .arrow { font-size: 0.65rem; transition: transform 0.2s; }
.admin-badge { display: inline-flex; align-items: center; justify-content: center; min-width: 18px; height: 18px; padding: 0 5px; background: var(--red); color: #fff; font-size: 0.68rem; font-weight: 700; border-radius: 9px; line-height: 1; vertical-align: middle; }
.nav-dropdown:hover .nav-dropdown-btn .arrow, .nav-dropdown.open .nav-dropdown-btn .arrow { transform: rotate(180deg); }
.nav-dropdown-menu { display: none; position: absolute; top: calc(100% + 10px); left: 50%; transform: translateX(-50%); background: var(--black); border: 1px solid var(--border); border-top: 2px solid var(--red); min-width: 200px; z-index: 300; box-shadow: 0 8px 24px rgba(0,0,0,0.5); }
.nav-dropdown.open .nav-dropdown-menu { display: block; }
.nav-dropdown-menu a { display: block; padding: 0.75rem 1.2rem; color: var(--grey-light); text-decoration: none; font-size: 0.85rem; font-weight: 500; letter-spacing: 0.5px; border-bottom: 1px solid var(--border); transition: all 0.15s; white-space: nowrap; }
.nav-dropdown-menu a:last-child { border-bottom: none; }
.nav-dropdown-menu a:hover, .nav-dropdown-menu a.active { background: rgba(192,57,43,0.1); color: var(--red); padding-left: 1.5rem; }
.admin-mob-group { font-size:0.68rem;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:var(--red);padding:0.8rem 0 0.5rem;border-bottom:1px solid var(--border);margin-top:0.5rem;margin-bottom:0.3rem; }
#admin-mobile-menu .admin-mob-group:first-child { margin-top:0; }
</style>
<script>
(function(){var b=document.getElementById('admin-hamburger'),m=document.getElementById('admin-mobile-menu');if(b&&m){b.addEventListener('click',function(){var o=m.classList.toggle('open');b.classList.toggle('open',o);document.body.style.overflow=o?'hidden':'';});m.querySelectorAll('a').forEach(function(l){l.addEventListener('click',function(){m.classList.remove('open');b.classList.remove('open');document.body.style.overflow='';});});window.addEventListener('resize',function(){if(window.innerWidth>768){m.classList.remove('open');b.classList.remove('open');document.body.style.overflow='';}});}
document.querySelectorAll('.nav-dropdown-btn').forEach(function(d){d.addEventListener('click',function(e){e.stopPropagation();var p=this.closest('.nav-dropdown'),o=p.classList.contains('open');document.querySelectorAll('.nav-dropdown').forEach(function(x){x.classList.remove('open');});if(!o)p.classList.add('open');});});
document.addEventListener('click',function(){document.querySelectorAll('.nav-dropdown').forEach(function(d){d.classList.remove('open');});});
document.querySelectorAll('.nav-dropdown-menu').forEach(function(m){m.addEventListener('click',function(e){e.stopPropagation();});});})();
</script>`;
}

export { raw, html };
