import type { Env } from '../types';

export interface ServiciuSeo {
  slug: string;
  nume: string;
  h1: string;
  meta: string;
  intro: string;
  include: string[];
  extra: string;
}

// Conținut implicit — se populează automat în baza de date la prima accesare.
export const SERVICII_SEO_DEFAULT: ServiciuSeo[] = [
  { slug: 'revizie-auto', nume: 'Revizie auto', h1: 'Revizie auto în București', meta: 'Revizie auto completă în București la APG Garage: schimb ulei și filtre, verificare frâne, suspensie, lichide și elemente de uzură. Programează-te online.', intro: 'Revizia periodică este cel mai simplu mod de a-ți menține mașina sigură și fiabilă. La APG Garage facem revizii complete pentru orice marcă și model, cu piese de calitate și verificări amănunțite.', include: ['Schimb ulei motor și filtru de ulei', 'Înlocuire filtru aer, filtru polen și filtru combustibil', 'Verificare sistem de frânare și plăcuțe', 'Control suspensie, direcție și geometrie', 'Verificare și completare lichide (răcire, frână, parbriz)', 'Diagnoză computerizată pentru erori'], extra: 'Îți recomandăm o revizie la fiecare 10.000–15.000 km sau o dată pe an. După revizie, îți setăm un reminder automat ca să nu pierzi următoarea scadență.' },
  { slug: 'mecanica-auto', nume: 'Mecanică auto', h1: 'Service mecanică auto în București', meta: 'Service mecanică auto în Militari și Sector 6, București. Reparații mecanice pentru orice marcă — Honda, Toyota, VW, Dacia. Programează-te online la APG Garage.', intro: 'De la zgomote suspecte la defecțiuni complexe, ne ocupăm de orice reparație mecanică. Diagnosticăm corect și reparăm durabil, cu piese de calitate, pentru orice marcă și model.', include: ['Reparații motor și ambreiaj', 'Distribuție, curele și role', 'Sistem de răcire și termostat', 'Reparații cutie de viteze', 'Înlocuire rulmenți, fuzete și articulații', 'Reparații Honda, Toyota, Volkswagen, BMW, Dacia și alte mărci'], extra: 'Indiferent de problemă, îți spunem clar ce trebuie făcut și cât costă, înainte de a începe lucrarea.' },
  { slug: 'diagnoza-auto', nume: 'Diagnoză computerizată', h1: 'Diagnoză auto computerizată în București', meta: 'Diagnoză auto computerizată în București la APG Garage. Citim erorile din calculatorul mașinii și îți spunem exact ce trebuie reparat. Programează-te online.', intro: 'Martorul de bord aprins nu înseamnă mereu o problemă gravă — dar trebuie verificat. Cu tester profesional citim codurile de eroare din toate calculatoarele mașinii și stabilim cauza reală, fără presupuneri.', include: ['Citire și ștergere coduri de eroare (OBD)', 'Verificare motor, transmisie, ABS, airbag', 'Analiză parametri în timp real', 'Identificarea cauzei și estimare de cost', 'Raport clar, pe înțelesul tău'], extra: 'O diagnoză corectă te scutește de reparații inutile. Îți explicăm exact ce am găsit și ce este sau nu urgent de rezolvat.' },
  { slug: 'sistem-franare', nume: 'Sistem de frânare', h1: 'Reparații sistem de frânare în București', meta: 'Service frâne în București la APG Garage: înlocuire plăcuțe și discuri, verificare etrieri și lichid de frână. Siguranța ta este prioritatea noastră.', intro: 'Frânele sunt cel mai important sistem de siguranță al mașinii. Verificăm și înlocuim componentele uzate cu piese de calitate, ca să frânezi sigur în orice condiții.', include: ['Înlocuire plăcuțe și discuri de frână', 'Verificare etrieri și furtune', 'Schimb lichid de frână', 'Verificare frână de mână și ABS', 'Test de frânare după intervenție'], extra: 'Dacă auzi scârțâit la frânare sau simți vibrații în pedală, programează-te cât mai repede pentru o verificare.' },
  { slug: 'suspensie-directie', nume: 'Suspensie și direcție', h1: 'Reparații suspensie și direcție în București', meta: 'Service suspensie și direcție în București la APG Garage: amortizoare, bucșe, articulații, geometrie roți. Confort și siguranță la drum.', intro: 'O suspensie în stare bună înseamnă confort, aderență și control. Diagnosticăm și reparăm problemele de suspensie și direcție, apoi reglăm geometria pentru o conducere sigură.', include: ['Înlocuire amortizoare și arcuri', 'Schimb bucșe, pivoți și capete de bară', 'Verificare rulmenți roți', 'Reglare geometrie (aliniere) roți', 'Test pe drum după intervenție'], extra: 'Zgomotele la trecerea peste denivelări sau uzura neuniformă a anvelopelor sunt semne că suspensia are nevoie de o verificare.' },
  { slug: 'sistem-racire', nume: 'Reparații și mentenanță sistem răcire', h1: 'Reparații sistem de răcire în București', meta: 'Reparații și mentenanță sistem de răcire auto în București la APG Garage: radiator, pompă de apă, termostat, furtune și antigel. Previi supraîncălzirea motorului.', intro: 'Sistemul de răcire ține motorul la temperatura optimă. Când apar scurgeri, supraîncălzire sau pierderi de lichid, intervenim rapid ca să eviți defecțiuni grave și costisitoare la motor.', include: ['Verificare și înlocuire radiator', 'Schimb pompă de apă', 'Înlocuire termostat', 'Schimb furtune și coliere', 'Verificare și completare antigel', 'Verificare ventilator și senzori de temperatură'], extra: 'Supraîncălzirea poate distruge motorul. Dacă indicatorul de temperatură urcă sau observi lichid sub mașină, programează-te cât mai repede.' },
  { slug: 'schimb-ulei', nume: 'Schimb ulei și filtre', h1: 'Schimb ulei și filtre în București', meta: 'Schimb ulei și filtre în București la APG Garage, rapid și cu uleiuri de calitate, potrivite pentru mașina ta. Programează-te online.', intro: 'Uleiul curat protejează motorul și îi prelungește viața. Folosim uleiuri și filtre potrivite specificațiilor mașinii tale și efectuăm schimbul rapid și corect.', include: ['Schimb ulei motor cu specificația corectă', 'Înlocuire filtru de ulei', 'Verificare nivel lichide', 'Resetare indicator service', 'Verificare scurgeri'], extra: 'Îți recomandăm schimbul de ulei la fiecare 10.000–15.000 km sau anual, în funcție de tipul de ulei și de utilizarea mașinii.' },
  { slug: 'asistenta-circuit', nume: 'Asistență la circuit', h1: 'Asistență tehnică la circuit', meta: 'Asistență tehnică la circuit și track day de la APG Garage: pregătirea mașinii, verificări pre-circuit, suport în boxe și intervenții rapide. Contactează-ne din timp.', intro: 'Vrei să ieși pe circuit fără griji? Îți pregătim mașina pentru track day și îți oferim asistență tehnică la fața locului — de la verificările înainte de intrarea pe pistă, până la intervenții rapide în boxe.', include: ['Verificare tehnică completă înainte de circuit', 'Schimb plăcuțe și lichid de frână pentru uz intens', 'Verificare presiuni, uzură anvelope și suspensie', 'Verificare nivel lichide și sistem de răcire', 'Asistență tehnică în boxe în timpul evenimentului', 'Intervenții rapide și consultanță de setup'], extra: 'Circuitul solicită mașina la maxim. O pregătire corectă înseamnă siguranță și performanță — contactează-ne din timp ca să planificăm totul înainte de eveniment.' },
  { slug: 'verificare-rampa', nume: 'Verificare rampă', h1: 'Verificare rampă auto în București', meta: 'Verificare pe rampă în București la APG Garage înainte de ITP sau de un drum lung. Verificăm dedesubtul mașinii și îți spunem ce trebuie reparat.', intro: 'O verificare pe rampă îți arată starea reală a mașinii dedesubt — util înainte de ITP, înaintea unui drum lung sau la achiziția unei mașini second-hand.', include: ['Inspecție vizuală a șasiului și caroseriei', 'Verificare sistem de evacuare', 'Control suspensie, direcție și frâne', 'Identificare scurgeri și coroziune', 'Recomandări clare pentru ITP'], extra: 'Îți setăm și un reminder automat pentru următoarea verificare, la intervalul stabilit împreună.' },
];

let ensured = false;
export async function ensureServiciiSeo(env: Env): Promise<void> {
  if (ensured) return;
  await env.DB.prepare(
    `CREATE TABLE IF NOT EXISTS servicii_seo (
      id      INTEGER PRIMARY KEY AUTOINCREMENT,
      slug    TEXT NOT NULL UNIQUE,
      nume    TEXT NOT NULL,
      h1      TEXT NOT NULL,
      meta    TEXT,
      intro   TEXT,
      include TEXT,
      extra   TEXT,
      ordine  INTEGER NOT NULL DEFAULT 0,
      activ   INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
  ).run();
  // Inserează paginile implicite care lipsesc (inclusiv cele adăugate ulterior
  // în cod), fără a suprascrie conținutul editat din admin.
  let i = 0;
  for (const s of SERVICII_SEO_DEFAULT) {
    i++;
    await env.DB.prepare('INSERT INTO servicii_seo (slug, nume, h1, meta, intro, include, extra, ordine) VALUES (?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(slug) DO NOTHING')
      .bind(s.slug, s.nume, s.h1, s.meta, s.intro, s.include.join('\n'), s.extra, i)
      .run();
  }
  ensured = true;
}

function rowToSeo(r: any): ServiciuSeo {
  return {
    slug: r.slug,
    nume: r.nume,
    h1: r.h1,
    meta: r.meta ?? '',
    intro: r.intro ?? '',
    include: String(r.include ?? '').split('\n').map((x: string) => x.trim()).filter(Boolean),
    extra: r.extra ?? '',
  };
}

export type ServiciuSeoRow = ServiciuSeo & { id: number; activ: number; ordine: number };

export async function getToateSeo(env: Env, doarActive = false): Promise<ServiciuSeoRow[]> {
  await ensureServiciiSeo(env);
  const w = doarActive ? 'WHERE activ = 1' : '';
  const { results } = await env.DB.prepare(`SELECT * FROM servicii_seo ${w} ORDER BY ordine ASC, id ASC`).all<any>();
  return (results ?? []).map((r) => ({ ...rowToSeo(r), id: r.id, activ: r.activ, ordine: r.ordine }));
}

export async function getSeoBySlug(env: Env, slug: string): Promise<ServiciuSeo | null> {
  await ensureServiciiSeo(env);
  const r = await env.DB.prepare('SELECT * FROM servicii_seo WHERE slug = ? AND activ = 1').bind(slug).first<any>();
  return r ? rowToSeo(r) : null;
}
