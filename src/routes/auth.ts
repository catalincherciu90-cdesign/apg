import { Hono } from 'hono';
import type { Env, Variables, SessionUser } from '../types';
import { page } from '../views/layout';
import { esc } from '../lib/format';
import { verifyPassword, hashPassword } from '../lib/password';
import { createSessionCookie, destroySession } from '../lib/session';
import { notificareContNou } from '../lib/notificari';

const app = new Hono<{ Bindings: Env; Variables: Variables }>();

const AUTH_STYLE = `<style>
    .auth-wrap { min-height:calc(100vh - 64px); display:flex; align-items:center; justify-content:center; padding:2rem; }
    .auth-box { width:100%; max-width:460px; }
    .auth-box .page-title { font-size:1.8rem; margin-bottom:0.2rem; }
    .auth-box .page-subtitle { margin-bottom:1.5rem; }
    .auth-footer { margin-top:1.2rem; text-align:center; color:var(--grey); font-size:0.9rem; }
    .auth-footer a { color:var(--red); text-decoration:none; }
</style>`;

function loginBody(error: string, accesError: boolean, email: string): string {
  return `<div class="auth-wrap"><div class="auth-box">
    <div class="page-title">Bun <span>venit</span></div>
    <div class="page-subtitle">Autentifică-te în contul tău</div>
    ${error ? `<div class="alert alert-error">${esc(error)}</div>` : ''}
    ${accesError ? `<div class="alert alert-error">Nu ai acces la această secțiune.</div>` : ''}
    <div class="card"><form method="POST">
        <div class="form-group"><label>Email</label><input type="email" name="email" value="${esc(email)}" required autofocus></div>
        <div class="form-group"><label>Parolă</label><input type="password" name="parola" required></div>
        <button type="submit" class="btn btn-primary" style="width:100%;margin-top:0.5rem;">Autentificare</button>
    </form></div>
    <div class="auth-footer">Nu ai cont? <a href="/register">Înregistrează-te</a></div>
  </div></div>`;
}

app.get('/login', (c) => {
  if (c.get('user')) return c.redirect('/dashboard');
  const accesError = c.req.query('eroare') === 'acces';
  return c.html(page({ title: 'Autentificare — APG Garage', user: null, nav: 'public', pagini: c.get('pagini'), robots: 'noindex, nofollow', headExtra: AUTH_STYLE, body: loginBody('', accesError, '') }));
});

app.post('/login', async (c) => {
  if (c.get('user')) return c.redirect('/dashboard');
  const form = await c.req.formData();
  const email = String(form.get('email') ?? '').trim();
  const parola = String(form.get('parola') ?? '');

  let error = '';
  if (!email || !parola) {
    error = 'Completează email-ul și parola.';
  } else {
    const user = await c.env.DB.prepare('SELECT * FROM users WHERE email = ?').bind(email).first<any>();
    if (user && (await verifyPassword(parola, user.parola))) {
      let perms: string[] = [];
      if (user.rol === 'angajat' && user.permisiuni) {
        try { const d = JSON.parse(user.permisiuni); if (Array.isArray(d)) perms = d; } catch { /* ignore */ }
      }
      const sess: SessionUser = { uid: user.id, rol: user.rol, nume: user.nume, perms };
      await createSessionCookie(c, sess);
      return c.redirect(user.rol === 'angajat' ? '/admin' : '/dashboard');
    }
    error = 'Email sau parolă incorectă.';
  }
  return c.html(page({ title: 'Autentificare — APG Garage', user: null, nav: 'public', pagini: c.get('pagini'), robots: 'noindex, nofollow', headExtra: AUTH_STYLE, body: loginBody(error, false, email) }));
});

function registerBody(error: string, success: string, vals: Record<string, string>): string {
  return `<div class="auth-wrap"><div class="auth-box">
    <div class="page-title">Creare <span>cont</span></div>
    <div class="page-subtitle">Înregistrează-te pentru a face o programare</div>
    ${error ? `<div class="alert alert-error">${esc(error)}</div>` : ''}
    ${success ? `<div class="alert alert-success">${esc(success)} <a href="/login" style="color:inherit;font-weight:600;">Mergi la login →</a></div>` : ''}
    <div class="card"><form method="POST">
        <div class="form-group"><label>Nume complet *</label><input type="text" name="nume" value="${esc(vals.nume ?? '')}" required></div>
        <div class="form-group"><label>Email *</label><input type="email" name="email" value="${esc(vals.email ?? '')}" required></div>
        <div class="form-group"><label>Telefon</label><input type="tel" name="telefon" value="${esc(vals.telefon ?? '')}"></div>
        <div class="form-group"><label>Parolă * (minim 6 caractere)</label><input type="password" name="parola" required></div>
        <div class="form-group"><label>Confirmă parola *</label><input type="password" name="parola2" required></div>
        <button type="submit" class="btn btn-primary" style="width:100%;margin-top:0.5rem;">Creează cont</button>
    </form></div>
    <div class="auth-footer">Ai deja cont? <a href="/login">Autentifică-te</a></div>
  </div></div>`;
}

app.get('/register', (c) => {
  if (c.get('user')) return c.redirect('/dashboard');
  return c.html(page({ title: 'Creare cont — APG Garage', user: null, nav: 'public', pagini: c.get('pagini'), robots: 'noindex, nofollow', headExtra: AUTH_STYLE, body: registerBody('', '', {}) }));
});

app.post('/register', async (c) => {
  if (c.get('user')) return c.redirect('/dashboard');
  const form = await c.req.formData();
  const nume = String(form.get('nume') ?? '').trim();
  const email = String(form.get('email') ?? '').trim();
  const telefon = String(form.get('telefon') ?? '').trim();
  const parola = String(form.get('parola') ?? '');
  const parola2 = String(form.get('parola2') ?? '');

  let error = '';
  let success = '';
  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  if (!nume || !email || !parola) {
    error = 'Completează toate câmpurile obligatorii.';
  } else if (!emailValid) {
    error = 'Adresa de email nu este validă.';
  } else if (parola.length < 6) {
    error = 'Parola trebuie să aibă minim 6 caractere.';
  } else if (parola !== parola2) {
    error = 'Parolele nu coincid.';
  } else {
    const exists = await c.env.DB.prepare('SELECT id FROM users WHERE email = ?').bind(email).first();
    if (exists) {
      error = 'Există deja un cont cu această adresă de email.';
    } else {
      const hash = await hashPassword(parola);
      await c.env.DB.prepare('INSERT INTO users (nume, email, parola, telefon) VALUES (?, ?, ?, ?)').bind(nume, email, hash, telefon).run();
      c.executionCtx.waitUntil(notificareContNou(c.env, nume, email, telefon));
      success = 'Cont creat cu succes! Te poți autentifica acum.';
    }
  }
  const vals: Record<string, string> = error ? { nume, email, telefon } : {};
  return c.html(page({ title: 'Creare cont — APG Garage', user: null, nav: 'public', pagini: c.get('pagini'), robots: 'noindex, nofollow', headExtra: AUTH_STYLE, body: registerBody(error, success, vals) }));
});

app.get('/logout', (c) => {
  destroySession(c);
  return c.redirect('/login');
});

export default app;
