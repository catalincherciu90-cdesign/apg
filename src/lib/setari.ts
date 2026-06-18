import type { Env } from '../types';

// Valori implicite pentru continutul editabil al site-ului.
// Cheile sunt cele citite de paginile publice si editate din /admin/continut, /admin/contact, /admin/setari.
export const SETARI_DEFAULT: Record<string, string> = {
  // Hero / home
  home_tag: 'Service Auto București',
  home_titlu: 'APG',
  home_subtitlu: 'Garage',
  home_descriere: 'Revizii și reparații mecanice profesionale. Programează-te online și evită timpul de așteptare.',
  home_despre_titlu: 'De ce APG Garage',
  home_ani_experienta: '10+',
  home_clienti: '500+',
  home_timp_revizie: '2h',
  // Despre
  despre_titlu: 'Despre APG Garage',
  despre_descriere: 'Un service auto cu experiență, dedicat calității și transparenței.',
  despre_text_1: '',
  despre_text_2: '',
  despre_text_3: '',
  // Contact
  contact_adresa: 'Strada Exemplu, Nr. 00, București',
  contact_telefon: '0700 000 000',
  contact_email: 'contact@apg-garage.ro',
  contact_program_sapt: 'Luni — Vineri',
  contact_program_ore: '09:00 — 17:00',
  contact_maps_url: '',
  // WhatsApp + date firmă (pentru butoane flotante și pagini legale)
  whatsapp_numar: '',
  firma_cui: '',
  firma_reg_com: '',
  // Tractari
  tractari_activ: '1',
  tractari_telefon: '',
  tractari_mesaj: 'Serviciul de tractări nu este disponibil momentan. Contactează-ne direct pentru urgențe.',
  tractari_titlu: 'Serviciu indisponibil',
  // Dezmembrari
  dezmembrari_activ: '1',
  dezmembrari_telefon: '',
  dezmembrari_mesaj: 'Secțiunea de piese din dezmembrări nu este disponibilă momentan. Revino în curând sau contactează-ne direct.',
  dezmembrari_titlu: 'Serviciu indisponibil',
  // Activare/dezactivare pagini informative
  pagina_despre: '1',
  pagina_preturi: '1',
  pagina_contact: '1',
  // Câte mașini pot fi în lucru simultan (capacitate programări)
  capacitate_simultan: '1',
  // Notificări — adresele de admin care primesc alertele (separate prin virgulă)
  notif_admin_emails: 'notificari.apggarage@gmail.com',
  // Interval (luni) după care se trimite reminder pentru verificarea de rampă
  rampa_interval_luni: '24',
  // Ore de muncă disponibile pe săptămână (pentru indicatorul de încărcare)
  ore_munca_saptamanal: '40',
};

// Pagini informative care pot fi activate/dezactivate din admin (Setări site).
export const PAGINI_TOGGLE = [
  { key: 'pagina_despre', titlu: 'Pagina Despre noi', url: '/despre' },
  { key: 'pagina_preturi', titlu: 'Pagina Prețuri', url: '/preturi' },
  { key: 'pagina_contact', titlu: 'Pagina Contact', url: '/contact' },
] as const;

export function paginaActiva(s: Record<string, string>, key: string): boolean {
  return (s[key] ?? '1') === '1';
}

// Vizibilitatea linkurilor din meniul public (pentru ascundere când o pagină e dezactivată)
export function navVisibility(s: Record<string, string>): Record<string, boolean> {
  return {
    despre: paginaActiva(s, 'pagina_despre'),
    preturi: paginaActiva(s, 'pagina_preturi'),
    contact: paginaActiva(s, 'pagina_contact'),
    tractari: paginaActiva(s, 'tractari_activ'),
    dezmembrari: paginaActiva(s, 'dezmembrari_activ'),
  };
}

export async function getSetari(env: Env): Promise<Record<string, string>> {
  const { results } = await env.DB.prepare('SELECT cheie, valoare FROM setari').all<{ cheie: string; valoare: string }>();
  const map: Record<string, string> = { ...SETARI_DEFAULT };
  for (const row of results ?? []) map[row.cheie] = row.valoare ?? '';
  return map;
}

export async function setSetare(env: Env, cheie: string, valoare: string): Promise<void> {
  await env.DB.prepare('INSERT INTO setari (cheie, valoare) VALUES (?, ?) ON CONFLICT(cheie) DO UPDATE SET valoare = excluded.valoare')
    .bind(cheie, valoare)
    .run();
}
