import type { Env } from '../types';

// Valori implicite pentru continutul editabil al site-ului.
// Cheile sunt cele citite de paginile publice si editate din /admin/continut, /admin/contact, /admin/setari.
export const SETARI_DEFAULT: Record<string, string> = {
  // Hero / home
  home_tag: 'Servis Auto București',
  home_titlu: 'APG',
  home_subtitlu: 'Garage',
  home_descriere: 'Revizii și reparații mecanice profesionale. Programează-te online și evită timpul de așteptare.',
  home_despre_titlu: 'De ce APG Garage',
  home_ani_experienta: '10+',
  home_clienti: '500+',
  home_timp_revizie: '2h',
  // Despre
  despre_titlu: 'Despre APG Garage',
  despre_descriere: 'Un servis auto cu experiență, dedicat calității și transparenței.',
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
};

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
