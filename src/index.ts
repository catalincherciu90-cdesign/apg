import { Hono } from 'hono';
import type { Env, Variables } from './types';
import { loadUser } from './lib/auth';
import { page } from './views/layout';
import publicRoutes from './routes/public';
import authRoutes from './routes/auth';
import clientRoutes from './routes/client';
import adminRoutes from './routes/admin';
import { ruleazaNotificariRevizie } from './cron';

const app = new Hono<{ Bindings: Env; Variables: Variables }>();

// Incarca utilizatorul din cookie pentru toate rutele
app.use('*', loadUser);

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
  return c.html(page({ title: 'Pagină negăsită — APG Garage', user: c.get('user'), nav: 'public', body }), 404);
});

export default {
  fetch: app.fetch,
  async scheduled(_event: ScheduledController, env: Env, ctx: ExecutionContext): Promise<void> {
    ctx.waitUntil(ruleazaNotificariRevizie(env));
  },
};
