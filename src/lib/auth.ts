import type { MiddlewareHandler } from 'hono';
import type { Env, Variables } from '../types';
import { readSession } from './session';
import { are as arePerm, isSuperAdmin } from './permisiuni';

type AppEnv = { Bindings: Env; Variables: Variables };

// Incarca utilizatorul din cookie in context (echivalent session_start + $_SESSION)
export const loadUser: MiddlewareHandler<AppEnv> = async (c, next) => {
  c.set('user', await readSession(c));
  await next();
};

// Auth::requireLogin()
export const requireLogin: MiddlewareHandler<AppEnv> = async (c, next) => {
  if (!c.get('user')) return c.redirect('/login');
  await next();
};

// Doar clienti (Auth::requireLogin + redirect angajat catre admin)
export const requireClient: MiddlewareHandler<AppEnv> = async (c, next) => {
  const u = c.get('user');
  if (!u) return c.redirect('/login');
  if (u.rol === 'angajat') return c.redirect('/admin');
  await next();
};

// Auth::requireAngajat()
export const requireAngajat: MiddlewareHandler<AppEnv> = async (c, next) => {
  const u = c.get('user');
  if (!u) return c.redirect('/login');
  if (u.rol !== 'angajat') return c.redirect('/dashboard');
  await next();
};

// Permisiuni::requireAccess($sectiune)
export function requireAccess(sectiune: string): MiddlewareHandler<AppEnv> {
  return async (c, next) => {
    const u = c.get('user');
    if (!u || u.rol !== 'angajat') return c.redirect('/login');
    if (!arePerm(u, sectiune)) return c.redirect('/admin?eroare=acces');
    await next();
  };
}

// Permisiuni::isSuperAdmin()
export const requireSuperAdmin: MiddlewareHandler<AppEnv> = async (c, next) => {
  const u = c.get('user');
  if (!u || u.rol !== 'angajat') return c.redirect('/login');
  if (!isSuperAdmin(u)) return c.redirect('/admin?eroare=acces');
  await next();
};
