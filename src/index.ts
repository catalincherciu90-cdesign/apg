import { Hono } from 'hono';
import type { Env, Variables } from './types';
import { loadUser } from './lib/auth';
import { getSetari, navVisibility } from './lib/setari';
import { page, SITE_URL } from './views/layout';
import publicRoutes from './routes/public';
import authRoutes from './routes/auth';
import clientRoutes from './routes/client';
import adminRoutes from './routes/admin';
import { ruleazaNotificariRevizie, ruleazaReminderProgramari, ruleazaNotificariRampa } from './cron';

const app = new Hono<{ Bindings: Env; Variables: Variables }>();

// Incarca utilizatorul din cookie pentru toate rutele
app.use('*', loadUser);

// Vizibilitatea paginilor (pentru ascunderea linkurilor din meniu)
app.use('*', async (c, next) => {
  try {
    c.set('pagini', navVisibility(await getSetari(c.env)));
  } catch {
    c.set('pagini', {});
  }
  await next();
});

// SEO: robots.txt + sitemap.xml
app.get('/robots.txt', (c) =>
  c.text(
    `User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /dashboard\nDisallow: /masini\nDisallow: /rezervare\nDisallow: /deviz\nDisallow: /login\nDisallow: /register\nDisallow: /logout\n\nSitemap: ${SITE_URL}/sitemap.xml\n`,
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
