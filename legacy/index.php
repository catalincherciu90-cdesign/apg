<?php
require_once __DIR__ . '/src/config/config.php';
require_once __DIR__ . '/src/config/db.php';
require_once __DIR__ . '/src/helpers/Auth.php';

// Incarca continutul din DB
$stmt = $pdo->query("SELECT cheie, valoare FROM setari WHERE cheie LIKE 'home_%'");
$s = [];
foreach ($stmt->fetchAll() as $row) { $s[$row['cheie']] = $row['valoare']; }

$home_tag           = $s['home_tag']           ?? 'Servis Auto București';
$home_titlu         = $s['home_titlu']          ?? 'APG';
$home_subtitlu      = $s['home_subtitlu']       ?? 'Garage';
$home_descriere     = $s['home_descriere']      ?? 'Revizii și reparații mecanice profesionale. Programează-te online și evită timpul de așteptare.';
$home_despre_titlu  = $s['home_despre_titlu']   ?? 'De ce APG Garage';
$home_ani           = $s['home_ani_experienta'] ?? '10+';
$home_clienti       = $s['home_clienti']        ?? '500+';
$home_timp          = $s['home_timp_revizie']   ?? '2h';
?>
<!DOCTYPE html>
<html lang="ro">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="theme-color" content="#c0392b">
    <meta name="apple-mobile-web-app-capable" content="yes">
    <meta name="apple-mobile-web-app-title" content="APG Garage">
    <link rel="manifest" href="/manifest.json">
    <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png">
    <script>if("serviceWorker"in navigator){window.addEventListener("load",function(){navigator.serviceWorker.register("/sw.js");});}</script>
    <title>APG Garage — Servis Auto</title>
    <link rel="stylesheet" href="/css/style.css">
    <style>
        .hero {
            min-height: calc(100vh - var(--nav-height));
            display: flex;
            align-items: center;
            padding: 3rem 1.5rem;
            position: relative;
            overflow: hidden;
        }
        .hero::before {
            content: '';
            position: absolute;
            inset: 0;
            background: repeating-linear-gradient(90deg, transparent, transparent 60px, rgba(255,255,255,0.015) 60px, rgba(255,255,255,0.015) 61px);
            pointer-events: none;
        }
        .hero-content { max-width: 700px; position: relative; z-index: 1; }
        .hero-tag { display:inline-block; background:var(--red); color:var(--white); font-size:0.7rem; font-weight:700; letter-spacing:3px; text-transform:uppercase; padding:0.3rem 0.8rem; margin-bottom:1.2rem; }
        .hero-title { font-family:'Barlow Condensed',sans-serif; font-size:clamp(3.5rem,12vw,6rem); font-weight:800; line-height:0.95; text-transform:uppercase; letter-spacing:2px; margin-bottom:1.2rem; }
        .hero-title span { color:var(--red); }
        .hero-desc { color:var(--grey-light); font-size:1rem; line-height:1.6; margin-bottom:2rem; max-width:500px; }
        .hero-btns { display:flex; gap:1rem; flex-wrap:wrap; }

        .services-section { padding:4rem 1.5rem; background:var(--black); border-top:1px solid var(--border); border-bottom:1px solid var(--border); }
        .services-section .section-label,.services-section .section-title { text-align:center; }
        .services-grid { display:grid; grid-template-columns:repeat(2,1fr); gap:1rem; max-width:1100px; margin:0 auto; }
        .service-card { background:var(--dark2); border:1px solid var(--border); border-top:3px solid var(--red); padding:1.5rem; }
        .service-card h3 { font-family:'Barlow Condensed',sans-serif; font-size:1.15rem; font-weight:700; text-transform:uppercase; letter-spacing:1px; margin-bottom:0.5rem; }
        .service-card p { color:var(--grey); font-size:0.88rem; line-height:1.6; }

        .why-section { padding:4rem 1.5rem; }
        .why-section .section-label,.why-section .section-title { text-align:center; }
        .why-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:1rem; max-width:1100px; margin:0 auto; }
        .why-item { text-align:center; padding:1.2rem 0.8rem; }
        .why-item .num { font-family:'Barlow Condensed',sans-serif; font-size:2.8rem; font-weight:800; color:var(--red); line-height:1; margin-bottom:0.4rem; }
        .why-item h3 { font-family:'Barlow Condensed',sans-serif; font-size:1rem; font-weight:700; text-transform:uppercase; letter-spacing:1px; margin-bottom:0.4rem; }
        .why-item p { color:var(--grey); font-size:0.85rem; line-height:1.5; }

        .program-section { padding:4rem 1.5rem; text-align:center; background:var(--black); border-top:1px solid var(--border); }
        .program-section h2 { font-family:'Barlow Condensed',sans-serif; font-size:1.8rem; font-weight:800; text-transform:uppercase; letter-spacing:2px; margin-bottom:0.8rem; }
        .program-section h2 span { color:var(--red); }
        .program-section p { color:var(--grey); margin-bottom:0.3rem; }

        @media(max-width:600px) {
            .services-grid { grid-template-columns:1fr; }
            .why-grid { grid-template-columns:repeat(2,1fr); }
            .hero-btns .btn { width:100%; text-align:center; }
        }
        @media(max-width:380px) { .why-grid { grid-template-columns:1fr; } }
    </style>
</head>
<body>

<?php require_once __DIR__ . '/src/views/nav.php'; ?>

<section class="hero">
    <div class="hero-content">
        <div class="hero-tag"><?= htmlspecialchars($home_tag) ?></div>
        <h1 class="hero-title"><?= htmlspecialchars($home_titlu) ?><br><span><?= htmlspecialchars($home_subtitlu) ?></span></h1>
        <p class="hero-desc"><?= htmlspecialchars($home_descriere) ?></p>
        <div class="hero-btns">
            <?php if (Auth::isLoggedIn() && !Auth::isAngajat()): ?>
                <a href="/rezervare.php" class="btn btn-primary">Fă o programare</a>
                <a href="/dashboard.php" class="btn btn-outline">Programările mele</a>
            <?php else: ?>
                <a href="/register.php" class="btn btn-primary">Programează-te acum</a>
                <a href="/preturi.php" class="btn btn-outline">Vezi prețuri</a>
            <?php endif; ?>
        </div>
    </div>
</section>

<section class="services-section">
    <div class="section-label">Ce facem</div>
    <div class="section-title">Serviciile <span>noastre</span></div>
    <div class="services-grid">
        <div class="service-card"><h3>Revizie completă</h3><p>Verificare și înlocuire ulei, filtre, lichide, plăcuțe de frână și toate elementele de uzură.</p></div>
        <div class="service-card"><h3>Reparații mecanice</h3><p>Diagnosticare computerizată și repararea oricărei defecțiuni mecanice.</p></div>
        <div class="service-card"><h3>Sistem de frânare</h3><p>Verificare, reglare și înlocuire componente sistem de frânare.</p></div>
        <div class="service-card"><h3>Suspensie și direcție</h3><p>Diagnosticare și reparare probleme de suspensie, geometrie și direcție.</p></div>
    </div>
</section>

<section class="why-section">
    <div class="section-label">De ce noi</div>
    <div class="section-title"><?= htmlspecialchars($home_despre_titlu) ?></div>
    <div class="why-grid">
        <div class="why-item">
            <div class="num"><?= htmlspecialchars($home_ani) ?></div>
            <h3>Ani experiență</h3>
            <p>Pe zeci de mărci și modele.</p>
        </div>
        <div class="why-item">
            <div class="num"><?= htmlspecialchars($home_clienti) ?></div>
            <h3>Clienți mulțumiți</h3>
            <p>Care revin și recomandă.</p>
        </div>
        <div class="why-item">
            <div class="num">100%</div>
            <h3>Transparență</h3>
            <p>Știi exact ce și cât costă.</p>
        </div>
        <div class="why-item">
            <div class="num"><?= htmlspecialchars($home_timp) ?></div>
            <h3>Timp mediu revizie</h3>
            <p>Lucrăm eficient.</p>
        </div>
    </div>
</section>

<section class="program-section">
    <h2>Program de <span>lucru</span></h2>
    <p>Luni — Vineri</p>
    <p style="font-family:'Barlow Condensed',sans-serif;font-size:1.5rem;font-weight:700;color:var(--white);margin:0.5rem 0 0.5rem;">09:00 — 17:00</p>
    <p style="color:var(--grey);margin-bottom:1.5rem;">Sâmbătă și duminică: închis</p>
    <a href="/contact.php" class="btn btn-outline">Contactează-ne</a>
</section>

<footer>© <?= date('Y') ?> APG Garage. Toate drepturile rezervate.</footer>
</body>
</html>
