import { Hono } from 'hono';
import type { Env, Variables } from '../../types';
import { page } from '../../views/layout';

const app = new Hono<{ Bindings: Env; Variables: Variables }>();

const APK_URL = '/download/apg-admin.apk';

app.get('/aplicatie', async (c) => {
  const user = c.get('user')!;
  const body = `<div class="container" style="max-width:640px;">
    <div class="page-title">Aplicația <span>de telefon</span></div>
    <div class="page-subtitle">Instalează aplicația de admin pe Android (APK)</div>

    <div class="card" style="text-align:center;padding:2rem 1.5rem;">
      <div style="font-size:2.5rem;margin-bottom:0.5rem;">📲</div>
      <p style="color:var(--grey-light);margin-bottom:1.5rem;">Descarcă aplicația și instaleaz-o pe telefon. Se deschide direct în admin, pe tot ecranul.</p>
      <a href="${APK_URL}" class="btn btn-primary" download style="font-size:1.1rem;padding:0.9rem 2rem;">⬇ Descarcă APK-ul</a>
      <div style="margin-top:1.5rem;"><div id="qr" style="display:inline-block;background:#fff;padding:10px;min-height:140px;min-width:140px;"></div><div style="font-size:0.78rem;color:var(--grey);margin-top:0.5rem;">Sau scanează codul cu telefonul</div></div>
      <p style="color:var(--grey);font-size:0.78rem;margin-top:1rem;">Dacă butonul dă eroare „404", aplicația încă se construiește — revino peste câteva minute.</p>
    </div>

    <div class="card">
      <h3 style="font-family:'Barlow Condensed',sans-serif;font-size:1.1rem;font-weight:700;text-transform:uppercase;letter-spacing:1px;margin-bottom:0.8rem;">Cum instalezi</h3>
      <ol style="color:var(--grey-light);line-height:1.8;font-size:0.9rem;padding-left:1.2rem;">
        <li>Apasă <strong>Descarcă APK-ul</strong> de pe telefon (sau scanează codul).</li>
        <li>Deschide fișierul descărcat. Dacă apare un avertisment, apasă <strong>„Permite din această sursă"</strong> / „Instalează oricum".</li>
        <li>Deschide aplicația și loghează-te o dată cu contul de admin — vei rămâne logat.</li>
      </ol>
      <p style="color:var(--grey);font-size:0.8rem;margin-top:0.8rem;">Funcționează pe Android. Pe iPhone, folosește butonul „Instalează aplicația" din meniu (Safari → Adaugă pe ecranul principal).</p>
    </div>
  </div>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"></script>
  <script>try{new QRCode(document.getElementById('qr'),{text:location.origin+'${APK_URL}',width:140,height:140});}catch(e){document.getElementById('qr').style.display='none';}</script>`;
  return c.html(page({ title: 'Aplicație telefon — Admin APG Garage', user, nav: 'admin', currentPath: '/admin/aplicatie', body }));
});

export default app;
