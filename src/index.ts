import { Hono } from 'hono';
import type { Env, Variables } from './types';
import { loadUser } from './lib/auth';
import { getSetari, navVisibility } from './lib/setari';
import { page, SITE_URL, siteFooter } from './views/layout';
import publicRoutes, { SERVICII_SLUGS } from './routes/public';
import authRoutes from './routes/auth';
import clientRoutes from './routes/client';
import adminRoutes from './routes/admin';
import { ruleazaNotificariRevizie, ruleazaReminderProgramari, ruleazaNotificariRampa } from './cron';

const app = new Hono<{ Bindings: Env; Variables: Variables }>();

// Incarca utilizatorul din cookie pentru toate rutele
app.use('*', loadUser);

// Vizibilitatea paginilor (pentru ascunderea linkurilor din meniu) +
// injectarea butoanelor flotante (WhatsApp / apel) și a bannerului de cookie-uri
// pe paginile publice.
app.use('*', async (c, next) => {
  let setari: Record<string, string> = {};
  try {
    setari = await getSetari(c.env);
    c.set('pagini', navVisibility(setari));
  } catch {
    c.set('pagini', {});
  }
  await next();

  const path = new URL(c.req.url).pathname;
  if (path.startsWith('/admin')) return;
  if (!(c.res.headers.get('content-type') ?? '').includes('text/html')) return;
  try {
    const tel = String(setari.contact_telefon ?? '').trim();
    const waRaw = (String(setari.whatsapp_numar ?? '').trim() || tel).replace(/[^\d+]/g, '');
    const waIntl = waRaw.startsWith('+') ? waRaw.slice(1) : waRaw.startsWith('0') ? '4' + waRaw : waRaw;

    const waBtn = waIntl
      ? `<a href="https://wa.me/${waIntl}" target="_blank" rel="noopener" aria-label="WhatsApp" class="apg-fab apg-fab-wa">
          <svg viewBox="0 0 24 24" width="28" height="28" fill="#fff"><path d="M12.04 2c-5.46 0-9.9 4.44-9.9 9.9 0 1.75.46 3.45 1.32 4.95L2 22l5.27-1.38a9.86 9.86 0 0 0 4.77 1.22c5.46 0 9.9-4.44 9.9-9.9S17.5 2 12.04 2zm0 18.02c-1.5 0-2.97-.4-4.25-1.16l-.3-.18-3.13.82.84-3.05-.2-.31a8.2 8.2 0 0 1-1.26-4.36c0-4.54 3.7-8.23 8.25-8.23 4.54 0 8.23 3.69 8.23 8.23 0 4.55-3.69 8.24-8.23 8.24zm4.52-6.16c-.25-.12-1.47-.72-1.69-.8-.23-.09-.39-.13-.56.12-.16.25-.64.8-.79.97-.14.16-.29.18-.54.06-.25-.12-1.05-.39-1.99-1.23-.74-.66-1.23-1.47-1.38-1.72-.14-.25-.01-.38.11-.5.11-.11.25-.29.37-.43.13-.15.17-.25.25-.42.08-.16.04-.31-.02-.43-.06-.12-.56-1.34-.76-1.84-.2-.48-.41-.42-.56-.43h-.48c-.16 0-.43.06-.65.31-.22.25-.86.84-.86 2.05 0 1.21.88 2.38 1 2.55.12.16 1.73 2.64 4.19 3.7.58.25 1.04.4 1.4.51.59.19 1.12.16 1.54.1.47-.07 1.47-.6 1.68-1.18.21-.58.21-1.07.14-1.18-.06-.1-.22-.16-.47-.28z"/></svg>
        </a>`
      : '';

    const chrome = `<style>
      .apg-fab{position:fixed;right:18px;width:54px;height:54px;border-radius:50%;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 16px rgba(0,0,0,.45);z-index:900;transition:transform .15s;}
      .apg-fab:hover{transform:scale(1.08);}
      .apg-fab-wa{bottom:18px;background:#25d366;}
      #apg-cookie{position:fixed;left:0;right:0;bottom:0;background:#0a0a0a;border-top:1px solid #2a2a2a;padding:1rem 1.2rem;z-index:950;display:none;flex-wrap:wrap;gap:0.8rem;align-items:center;justify-content:center;text-align:center;}
      #apg-cookie p{margin:0;color:#bbb;font-size:0.82rem;max-width:640px;}
      #apg-cookie a{color:#e74c3c;text-decoration:none;}
      #apg-cookie button{background:#c0392b;color:#fff;border:none;padding:0.5rem 1.2rem;font-weight:700;letter-spacing:.5px;text-transform:uppercase;font-size:0.78rem;cursor:pointer;}
    </style>
    ${waBtn}
    <div id="apg-cookie"><p>Folosim cookie-uri pentru funcționarea site-ului și îmbunătățirea experienței. Detalii în <a href="/cookies">Politica de cookie-uri</a>.</p><button onclick="(function(){try{localStorage.setItem('apg_cookie_ok','1')}catch(e){}document.getElementById('apg-cookie').style.display='none';})()">Accept</button></div>
    <script>(function(){try{if(!localStorage.getItem('apg_cookie_ok')){document.getElementById('apg-cookie').style.display='flex';}}catch(e){}})();</script>`;

    const footer = siteFooter(setari);
    const original = await c.res.text();
    const body = original.replace('</body>', footer + chrome + '</body>');
    const headers = new Headers(c.res.headers);
    headers.delete('content-length');
    headers.set('Cache-Control', 'private, no-cache');
    c.res = new Response(body, { status: c.res.status, statusText: c.res.statusText, headers });
  } catch {
    /* dacă apare o eroare, lăsăm pagina neschimbată */
  }
});

// SEO: robots.txt + sitemap.xml
app.get('/robots.txt', (c) =>
  c.text(
    `User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /dashboard\nDisallow: /masini\nDisallow: /rezervare\nDisallow: /deviz\nDisallow: /recenzie\nDisallow: /login\nDisallow: /register\nDisallow: /logout\n\nSitemap: ${SITE_URL}/sitemap.xml\n`,
  ),
);
app.get('/sitemap.xml', (c) => {
  const today = new Date().toISOString().slice(0, 10);
  const pages = [
    { p: '/', pr: '1.0' },
    { p: '/despre', pr: '0.7' },
    { p: '/preturi', pr: '0.8' },
    { p: '/tractari', pr: '0.7' },
    { p: '/dezmembrari', pr: '0.7' },
    { p: '/contact', pr: '0.6' },
    { p: '/servicii', pr: '0.8' },
    ...SERVICII_SLUGS.map((slug) => ({ p: '/servicii/' + slug, pr: '0.7' })),
    { p: '/confidentialitate', pr: '0.3' },
    { p: '/termeni', pr: '0.3' },
    { p: '/cookies', pr: '0.3' },
  ];
  const urls = pages
    .map((x) => `  <url><loc>${SITE_URL}${x.p}</loc><lastmod>${today}</lastmod><changefreq>weekly</changefreq><priority>${x.pr}</priority></url>`)
    .join('\n');
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
  return c.body(xml, 200, { 'Content-Type': 'application/xml; charset=utf-8' });
});

// Rute aplicatie
app.route('/', authRoutes);
app.route('/', clientRoutes);
app.route('/admin', adminRoutes);
app.route('/', publicRoutes);

// 404
app.notFound((c) => {
  const body = `<div class="container" style="padding:5rem 1.5rem;text-align:center;">
    <div class="page-title" style="font-size:4rem;">404</div>
    <p style="color:var(--grey);margin-bottom:1.5rem;">Pagina căutată nu există.</p>
    <a href="/" class="btn btn-primary">Înapoi acasă</a>
  </div>`;
  return c.html(page({ title: 'Pagină negăsită — APG Garage', user: c.get('user'), nav: 'public', pagini: c.get('pagini'), robots: 'noindex, nofollow', body }), 404);
});

export default {
  fetch: app.fetch,
  async scheduled(_event: ScheduledController, env: Env, ctx: ExecutionContext): Promise<void> {
    ctx.waitUntil(ruleazaNotificariRevizie(env));
    ctx.waitUntil(ruleazaReminderProgramari(env));
    ctx.waitUntil(ruleazaNotificariRampa(env));
  },
};
