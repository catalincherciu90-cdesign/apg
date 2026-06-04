import type { SessionUser } from '../types';

// Port din src/helpers/Permisiuni.php
export const SECTIUNI = ['programari', 'devize', 'servicii', 'tractari', 'dezmembrari'] as const;
export type Sectiune = (typeof SECTIUNI)[number];

export const LABELS: Record<string, string> = {
  programari: 'Programări & Devize',
  devize: 'Devize',
  servicii: 'Servicii',
  tractari: 'Tractări',
  dezmembrari: 'Dezmembrări & Cereri piese',
};

export function are(user: SessionUser | null, sectiune: string): boolean {
  if (!user || user.rol !== 'angajat') return false;
  return (user.perms ?? []).includes(sectiune);
}

export function isSuperAdmin(user: SessionUser | null): boolean {
  if (!user) return false;
  const perms = user.perms ?? [];
  return SECTIUNI.every((s) => perms.includes(s));
}
