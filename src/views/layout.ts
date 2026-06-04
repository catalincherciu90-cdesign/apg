import { html, raw } from 'hono/html';
import type { SessionUser } from '../types';
import { isSuperAdmin } from '../lib/permisiuni';
import { anCurent } from '../lib/format';

const HEAD_META = `
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="theme-color" content="#c0392b">
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
}

export function page(opts: PageOpts): string {
  const nav = opts.nav ?? 'public';
  const navHtml = nav === 'admin' ? navAdmin(opts.user, opts.currentPath ?? '') : nav === 'public' ? navPublic(opts.user) : '';
  const footer = nav === 'admin' ? '' : `<footer>© ${anCurent()} APG Garage. Toate drepturile rezervate.</footer>`;
  return `<!DOCTYPE html>
<html lang="ro">
<head>
${HEAD_META}
    <title>${opts.title}</title>
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

// Port din src/views/nav.php (URL-uri curate)
export function navPublic(user: SessionUser | null): string {
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
        <a href="/despre">Despre noi</a>
        <a href="/preturi">Prețuri</a>
        <a href="/tractari">Tractări</a>
        <a href="/dezmembrari">Dezmembrări</a>
        <a href="/contact">Contact</a>
        ${links}
    </div>
    <button class="hamburger" id="hamburger" aria-label="Meniu" aria-expanded="false"><span></span><span></span><span></span></button>
</nav>
<div class="mobile-menu" id="mobile-menu" aria-hidden="true">
    <a href="/">Acasă</a>
    <a href="/despre">Despre noi</a>
    <a href="/preturi">Prețuri</a>
    <a href="/tractari">Tractări auto</a>
    <a href="/dezmembrari">Piese dezmembrări</a>
    <a href="/contact">Contact</a>
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
    groups += `<div class="nav-dropdown"><button class="nav-dropdown-btn ${act(['/admin', '/admin/blocare'])}">Programări <span class="arrow">▾</span></button><div class="nav-dropdown-menu">${a('/admin', 'Toate programările')}${a('/admin/blocare', 'Zile blocate')}</div></div>`;
    mobile += `<div class="admin-mob-group">Programări</div><a href="/admin">Toate programările</a><a href="/admin/blocare">Zile blocate</a>`;
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
    groups += `<div class="nav-dropdown"><button class="nav-dropdown-btn ${act(['/admin/angajati', '/admin/setari', '/admin/contact', '/admin/continut'])}">Admin <span class="arrow">▾</span></button><div class="nav-dropdown-menu">${a('/admin/angajati', 'Angajați & Permisiuni')}${a('/admin/setari', 'Setări site')}${a('/admin/contact', 'Date contact')}${a('/admin/continut', 'Conținut site')}</div></div>`;
    mobile += `<div class="admin-mob-group">Administrare</div><a href="/admin/angajati">Angajați & Permisiuni</a><a href="/admin/setari">Setări site</a><a href="/admin/contact">Date contact</a><a href="/admin/continut">Conținut site</a>`;
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
