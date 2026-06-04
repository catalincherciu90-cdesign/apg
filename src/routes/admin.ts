import { Hono } from 'hono';
import type { Env, Variables } from '../types';
import { requireAngajat, requireAccess, requireSuperAdmin } from '../lib/auth';
import programari from './admin/programari';
import deviz from './admin/deviz';
import servicii from './admin/servicii';
import tractari from './admin/tractari';
import dezmembrari from './admin/dezmembrari';
import general from './admin/general';

const app = new Hono<{ Bindings: Env; Variables: Variables }>();

// Tot panoul de admin cere rol de angajat
app.use('*', requireAngajat);

// Gardieni pe secțiuni (Permisiuni::requireAccess / isSuperAdmin)
app.use('/servicii', requireAccess('servicii'));
app.use('/tractari', requireAccess('tractari'));
app.use('/dezmembrari', requireAccess('dezmembrari'));
app.use('/cereri-piese', requireAccess('dezmembrari'));
app.use('/preturi', requireSuperAdmin);
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

export default app;
