import { Hono } from 'hono';
import type { Env, Variables } from '../../types';
import { page } from '../../views/layout';

const app = new Hono<{ Bindings: Env; Variables: Variables }>();

const STYLE = `<style>
    .ghid-intro { color:var(--grey-light); font-size:0.95rem; line-height:1.7; margin-bottom:2rem; max-width:760px; }
    .ghid-grup { font-family:'Barlow Condensed',sans-serif; font-size:0.85rem; font-weight:700; letter-spacing:2px; text-transform:uppercase; color:var(--red); margin:2rem 0 1rem; padding-bottom:0.4rem; border-bottom:1px solid var(--border); }
    .ghid-card { background:var(--dark2); border:1px solid var(--border); border-left:4px solid var(--red); padding:1.3rem 1.5rem; margin-bottom:1rem; }
    .ghid-card h3 { font-family:'Barlow Condensed',sans-serif; font-size:1.2rem; font-weight:700; text-transform:uppercase; letter-spacing:1px; margin-bottom:0.3rem; }
    .ghid-card .link { font-size:0.78rem; color:var(--grey); margin-bottom:0.7rem; }
    .ghid-card p { color:var(--grey-light); font-size:0.9rem; line-height:1.65; margin-bottom:0.6rem; }
    .ghid-card ul { margin:0.4rem 0 0 1.1rem; }
    .ghid-card li { color:var(--grey-light); font-size:0.9rem; line-height:1.6; margin-bottom:0.25rem; }
    .ghid-card .super { display:inline-block; font-size:0.65rem; font-weight:700; letter-spacing:1px; text-transform:uppercase; color:#f0a500; background:#2a2000; padding:0.1rem 0.5rem; margin-left:0.5rem; vertical-align:middle; }
</style>`;

interface Sectiune {
  titlu: string;
  cale: string;
  super?: boolean;
  descriere: string;
  puncte: string[];
}
interface Grup {
  grup: string;
  sectiuni: Sectiune[];
}

const GHID: Grup[] = [
  {
    grup: 'Programări',
    sectiuni: [
      { titlu: 'Toate programările', cale: '/admin', descriere: 'Lista completă a programărilor, cu filtre pe status și dată. De aici gestionezi fiecare cerere.', puncte: ['Confirmă, respinge, marchează „în lucru" sau „finalizat" o programare.', 'La „Finalizat", data reviziei/verificării de rampă a mașinii se actualizează automat, iar clientul primește un email de follow-up pentru recenzie.', 'Butonul „Deviz" deschide devizul programării.', 'Badge-ul roșu de pe „Programări" arată câte programări sunt în așteptare.'] },
      { titlu: 'Programul zilei', cale: '/admin/zi', descriere: 'Vedere pe intervale orare a unei zile, cu ocuparea fiecărui slot.', puncte: ['Navighezi între zile și vezi câte mașini sunt programate pe fiecare interval.', 'Adaugi rapid o programare manuală (telefon / la fața locului), cu client existent sau nou.'] },
      { titlu: 'Zile blocate', cale: '/admin/blocare', descriere: 'Marchează zilele în care service-ul nu primește programări (concediu, sărbători).', puncte: ['Zilele blocate nu mai apar ca disponibile la programarea online.'] },
    ],
  },
  {
    grup: 'Servicii & prețuri',
    sectiuni: [
      { titlu: 'Gestionare servicii', cale: '/admin/servicii', descriere: 'Serviciile pe care le poate alege clientul la programare.', puncte: ['Adaugi, editezi, activezi/dezactivezi și reordonezi serviciile.', 'Setezi durata fiecărui serviciu (în ore) — se completează automat la programare.'] },
      { titlu: 'Prețuri', cale: '/admin/preturi', super: true, descriere: 'Lista de prețuri afișată public pe pagina Prețuri, grupată pe categorii.', puncte: ['Adaugi prețuri, alegi sau creezi categorii, le reordonezi prin tragere.', 'Poți redenumi o categorie întreagă dintr-un singur loc.'] },
      { titlu: 'Pagini servicii', cale: '/admin/pagini-servicii', descriere: 'Paginile de prezentare de la /servicii (categoriile principale de servicii).', puncte: ['Editezi numele, titlul, descrierea SEO, introducerea și lista „ce include".', 'Adaugi pagini noi de serviciu, le ascunzi sau le ștergi.'] },
    ],
  },
  {
    grup: 'Alte servicii',
    sectiuni: [
      { titlu: 'Tractări', cale: '/admin/tractari', descriere: 'Cererile de tractare trimise de clienți din formularul public.', puncte: ['Vezi datele și contactul clientului pentru fiecare cerere.'] },
      { titlu: 'Dezmembrări', cale: '/admin/dezmembrari', descriere: 'Mașinile disponibile pentru piese din dezmembrări, afișate public.', puncte: ['Adaugi/editezi mașini dezmembrate și le activezi/dezactivezi.'] },
      { titlu: 'Cereri piese', cale: '/admin/cereri-piese', descriere: 'Cererile de piese trimise de clienți pentru mașinile dezmembrate.', puncte: ['Răspunzi clientului (disponibil/indisponibil) — primește email cu răspunsul.'] },
    ],
  },
  {
    grup: 'Clienți & comunicare',
    sectiuni: [
      { titlu: 'Mesaje', cale: '/admin/mesaje', super: true, descriere: 'Mesajele primite prin formularul de contact.', puncte: ['Vezi, marchezi citit/necitit și răspunzi rapid.', 'Badge-ul roșu arată câte mesaje necitite ai.'] },
      { titlu: 'Clienți', cale: '/admin/clienti', super: true, descriere: 'Conturile clienților înregistrați.', puncte: ['Deschizi profilul fiecărui client: date de contact, istoric lucrări, zile până la revizie și verificare rampă.', 'Poți reseta parola unui client.'] },
      { titlu: 'Recenzii', cale: '/admin/recenzii', super: true, descriere: 'Testimonialele afișate pe pagina principală.', puncte: ['Adaugi manual recenzii sau aprobi cele trimise de clienți (după finalizarea lucrării).', 'Activezi/ascunzi și ștergi recenzii.'] },
    ],
  },
  {
    grup: 'Setări & administrare',
    sectiuni: [
      { titlu: 'Statistici', cale: '/admin/statistici', super: true, descriere: 'Imagine de ansamblu asupra activității.', puncte: ['Total programări, finalizate, clienți, lei facturați (total și luna curentă).', 'Grafic pe ultimele 6 luni, top servicii, devize aprobate/respinse.', 'Setezi orele de muncă pe săptămână și vezi gradul de încărcare.'] },
      { titlu: 'Notificări', cale: '/admin/notificari', super: true, descriere: 'Controlul emailurilor și al notificărilor push.', puncte: ['Pornești/oprești fiecare tip de notificare (client și admin).', 'Setezi adresa/adresele de admin care primesc alertele.', 'Trimiți un email de test și vezi jurnalul notificărilor.', 'Activezi notificările push pe telefon pentru programări noi.'] },
      { titlu: 'Angajați & Permisiuni', cale: '/admin/angajati', super: true, descriere: 'Conturile echipei și accesul fiecăruia.', puncte: ['Adaugi angajați — poți trimite invitație pe email ca să-și seteze singuri parola.', 'Setezi la ce secțiuni are acces fiecare angajat.'] },
      { titlu: 'Setări site', cale: '/admin/setari', super: true, descriere: 'Configurări generale ale site-ului.', puncte: ['Activezi/dezactivezi pagini și servicii cu formular.', 'Setezi capacitatea (mașini simultane) și intervalul de reminder pentru verificarea de rampă.'] },
      { titlu: 'Date contact', cale: '/admin/contact', super: true, descriere: 'Informațiile de contact și datele firmei.', puncte: ['Adresă, telefon, email, program, hartă Google, WhatsApp.', 'CUI și Reg. Comerțului (apar în footer și paginile legale).'] },
      { titlu: 'Conținut site', cale: '/admin/continut', super: true, descriere: 'Textele editabile de pe paginile publice (Acasă, Despre).', puncte: ['Modifici titlurile, descrierile și textele de prezentare.'] },
    ],
  },
];

app.get('/ghid', async (c) => {
  const user = c.get('user')!;
  const grupuri = GHID.map((g) => `
    <div class="ghid-grup">${g.grup}</div>
    ${g.sectiuni.map((s) => `<div class="ghid-card">
      <h3>${s.titlu}${s.super ? '<span class="super">super-admin</span>' : ''}</h3>
      <div class="link">${s.cale}</div>
      <p>${s.descriere}</p>
      <ul>${s.puncte.map((p) => `<li>${p}</li>`).join('')}</ul>
    </div>`).join('')}
  `).join('');

  const body = `<div class="container" style="max-width:820px;">
    <div class="page-title">Ghid <span>admin</span></div>
    <div class="page-subtitle">Cum funcționează fiecare rubrică din panou</div>
    <p class="ghid-intro">Acesta este ghidul rapid al panoului de administrare. Rubricile marcate cu <span style="color:#f0a500;font-weight:700;">super-admin</span> sunt vizibile doar contului principal. Fiecare secțiune are propriile acțiuni — apasă pe rubrica corespunzătoare din meniu pentru a lucra.</p>
    ${grupuri}
    <div class="ghid-card" style="border-left-color:#2ecc71;">
      <h3>Ai nevoie de ajutor?</h3>
      <p>Dacă vrei o funcție nouă sau o modificare, notează-ți ce ai nevoie și cere o actualizare. Panoul poate fi extins oricând.</p>
    </div>
  </div>`;
  return c.html(page({ title: 'Ghid admin — APG Garage', user, nav: 'admin', currentPath: '/admin/ghid', headExtra: STYLE, body }));
});

export default app;
