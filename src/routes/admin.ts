import { Hono } from 'hono';
import type { Env, Variables } from '../types';
import { requireAngajat, requireAccess, requireSuperAdmin } from '../lib/auth';
import { isSuperAdmin } from '../lib/permisiuni';
import { ensureMesaje } from '../lib/mesaje';
import programari from './admin/programari';
import deviz from './admin/deviz';
import servicii from './admin/servicii';
import tractari from './admin/tractari';
import dezmembrari from './admin/dezmembrari';
import general from './admin/general';
import mesaje from './admin/mesaje';

const app = new Hono<{ Bindings: Env; Variables: Variables }>();

// Tot panoul de admin cere rol de angajat
app.use('*', requireAngajat);

// Badge cu nr. de mesaje necitite pe butonul „Admin" din meniu (doar super-admin).
// Injectat în HTML după randare, ca să nu modificăm toate apelurile page().
app.use('*', async (c, next) => {
  await next();
  const user = c.get('user');
  if (!isSuperAdmin(user)) return;
  if (!(c.res.headers.get('content-type') ?? '').includes('text/html')) return;
  try {
    await ensureMesaje(c.env);
    const row = await c.env.DB.prepare('SELECT COUNT(*) AS n FROM mesaje WHERE citit = 0').first<{ n: number }>();
    const n = row?.n ?? 0;
    if (!n) return;
    const original = await c.res.text();
    const badge = `<span class="admin-badge">${n}</span>`;
    const body = original
      .replace('id="nav-mesaje" style="text-decoration:none;">Mesaje</a>', `id="nav-mesaje" style="text-decoration:none;">Mesaje ${badge}</a>`)
      .replace('<a href="/admin/mesaje">Mesaje</a>', `<a href="/admin/mesaje">Mesaje ${badge}</a>`);
    const headers = new Headers(c.res.headers);
    headers.delete('content-length');
    c.res = new Response(body, { status: c.res.status, statusText: c.res.statusText, headers });
  } catch {
    /* dacă tabela lipsește sau apare o eroare, lăsăm pagina neschimbată */
  }
});

// Gardieni pe secțiuni (Permisiuni::requireAccess / isSuperAdmin)
app.use('/servicii', requireAccess('servicii'));
app.use('/tractari', requireAccess('tractari'));
app.use('/dezmembrari', requireAccess('dezmembrari'));
app.use('/cereri-piese', requireAccess('dezmembrari'));
app.use('/preturi', requireSuperAdmin);
app.use('/clienti', requireSuperAdmin);
app.use('/mesaje', requireSuperAdmin);
app.use('/angajati', requireSuperAdmin);
app.use('/setari', requireSuperAdmin);
app.use('/contact', requireSuperAdmin);
app.use('/continut', requireSuperAdmin);

// Module (toate montate la rădăcina /admin)
app.route('/', programari); // /admin, /admin/blocare
app.route('/', deviz); // /admin/deviz
app.route('/', servicii); // /admin/servicii, /admin/preturi
app.route('/', tractari); // /admin/tractari
app.route('/', dezmembrari); // /admin/dezmembrari, /admin/cereri-piese
app.route('/', general); // /admin/angajati, /admin/setari, /admin/contact, /admin/continut
app.route('/', mesaje); // /admin/mesaje

export default app;
