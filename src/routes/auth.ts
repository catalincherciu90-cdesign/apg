import { Hono } from 'hono';
import type { Env, Variables, SessionUser } from '../types';
import { page } from '../views/layout';
import { esc } from '../lib/format';
import { verifyPassword, hashPassword } from '../lib/password';
import { createSessionCookie, destroySession } from '../lib/session';
import { notificareContNou } from '../lib/notificari';
import { inviteToken, ensureContActivat } from '../lib/invite';

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

/* ============================ SETARE CONT ANGAJAT (din invitație) ============================ */
async function invitatUser(c: any): Promise<any | null> {
  const uid = parseInt(c.req.query('uid') ?? c.req.query('u') ?? '0', 10);
  const t = c.req.query('t') ?? '';
  if (!uid || !t) return null;
  const u = (await c.env.DB.prepare(`SELECT id, nume, email, telefon, parola, permisiuni FROM users WHERE id = ? AND rol = 'angajat'`).bind(uid).first()) as any;
  if (!u) return null;
  const expected = await inviteToken(c.env, uid, u.parola);
  return t === expected ? u : null;
}

app.get('/seteaza-cont', async (c) => {
  const u = await invitatUser(c);
  let inner: string;
  if (!u) {
    inner = `<p style="color:var(--grey);">Link invalid sau deja folosit. Dacă ți-ai setat deja parola, mergi la <a href="/login" style="color:var(--red);">autentificare</a>.</p>`;
  } else {
    inner = `<form method="POST" action="/seteaza-cont">
        <input type="hidden" name="uid" value="${u.id}"><input type="hidden" name="t" value="${esc(c.req.query('t') ?? '')}">
        <p style="color:var(--grey);margin-bottom:1.2rem;">Bine ai venit, <strong style="color:var(--white)">${esc(u.nume)}</strong>! Setează-ți datele și parola pentru a-ți activa contul.</p>
        <div class="form-group"><label>Nume complet</label><input type="text" name="nume" value="${esc(u.nume)}" required></div>
        <div class="form-group"><label>Telefon</label><input type="tel" name="telefon" value="${esc(u.telefon ?? '')}" placeholder="07xx xxx xxx"></div>
        <div class="form-group"><label>Parolă * (minim 6 caractere)</label><input type="password" name="parola" required minlength="6" autocomplete="new-password"></div>
        <div class="form-group"><label>Confirmă parola *</label><input type="password" name="parola_confirm" required minlength="6" autocomplete="new-password"></div>
        <button type="submit" class="btn btn-primary" style="width:100%;">Activează contul</button>
      </form>`;
  }
  const body = `<div class="container" style="max-width:440px;padding-top:3rem;">
    <div class="page-title">Setează-ți <span>contul</span></div>
    <div class="card" style="margin-top:1.5rem;">${inner}</div>
  </div>`;
  return c.html(page({ title: 'Setează contul — APG Garage', user: null, nav: 'public', pagini: c.get('pagini'), robots: 'noindex, nofollow', body }));
});

app.post('/seteaza-cont', async (c) => {
  const form = await c.req.formData();
  const uid = parseInt(String(form.get('uid') ?? '0'), 10);
  const t = String(form.get('t') ?? '');
  const u = uid ? await c.env.DB.prepare(`SELECT id, parola FROM users WHERE id = ? AND rol = 'angajat'`).bind(uid).first<any>() : null;
  const valid = u && t === (await inviteToken(c.env, uid, u.parola));

  const nume = String(form.get('nume') ?? '').trim();
  const telefon = String(form.get('telefon') ?? '').trim();
  const parola = String(form.get('parola') ?? '');
  const confirm = String(form.get('parola_confirm') ?? '');
  let error = '';
  if (!valid) error = 'Link invalid sau deja folosit.';
  else if (!nume) error = 'Completează numele.';
  else if (parola.length < 6) error = 'Parola trebuie să aibă minim 6 caractere.';
  else if (parola !== confirm) error = 'Parolele nu coincid.';

  if (error) {
    const body = `<div class="container" style="max-width:440px;padding-top:3rem;">
      <div class="page-title">Setează-ți <span>contul</span></div>
      <div class="alert alert-error" style="margin-top:1.5rem;">${esc(error)}</div>
      ${valid ? `<a href="/seteaza-cont?uid=${uid}&t=${esc(t)}" class="btn btn-outline" style="margin-top:1rem;">Înapoi</a>` : `<a href="/login" class="btn btn-primary" style="margin-top:1rem;">Autentificare</a>`}
    </div>`;
    return c.html(page({ title: 'Setează contul — APG Garage', user: null, nav: 'public', pagini: c.get('pagini'), robots: 'noindex, nofollow', body }));
  }

  const hash = await hashPassword(parola);
  await ensureContActivat(c.env);
  await c.env.DB.prepare('UPDATE users SET nume = ?, telefon = ?, parola = ?, cont_activat = 1 WHERE id = ?').bind(nume, telefon, hash, uid).run();
  // Autentificare automată după activare
  const full = await c.env.DB.prepare('SELECT id, rol, nume, permisiuni FROM users WHERE id = ?').bind(uid).first<any>();
  let perms: string[] = [];
  try { const d = JSON.parse(full?.permisiuni ?? '[]'); if (Array.isArray(d)) perms = d; } catch { /* ignore */ }
  const sess: SessionUser = { uid: full.id, rol: full.rol, nume: full.nume, perms };
  await createSessionCookie(c, sess);
  return c.redirect('/admin');
});

export default app;
