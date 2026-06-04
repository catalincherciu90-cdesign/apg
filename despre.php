<?php
require_once __DIR__ . '/src/config/config.php';
require_once __DIR__ . '/src/config/db.php';
require_once __DIR__ . '/src/helpers/Auth.php';

// Incarca continutul din DB
$stmt = $pdo->query("SELECT cheie, valoare FROM setari WHERE cheie LIKE 'despre_%'");
$s = [];
foreach ($stmt->fetchAll() as $row) { $s[$row['cheie']] = $row['valoare']; }

$titlu      = $s['despre_titlu']      ?? 'Despre APG Garage';
$descriere  = $s['despre_descriere']  ?? 'Un servis auto cu experiență, dedicat calității și transparenței.';
$text_1     = $s['despre_text_1']     ?? '';
$text_2     = $s['despre_text_2']     ?? '';
$text_3     = $s['despre_text_3']     ?? '';
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
    <title>Despre noi — APG Garage</title>
    <link rel="stylesheet" href="/css/style.css">
    <style>
        .hero-small { padding:3rem 1.5rem 2.5rem; border-bottom:1px solid var(--border); background:var(--black); position:relative; overflow:hidden; }
        .hero-small::before { content:''; position:absolute; inset:0; background:repeating-linear-gradient(90deg, transparent, transparent 60px, rgba(255,255,255,0.015) 60px, rgba(255,255,255,0.015) 61px); }
        .hero-small > * { position:relative; z-index:1; }

        .about-grid { display:grid; grid-template-columns:1fr 1fr; gap:2.5rem; align-items:start; margin-bottom:3rem; }
        .about-text p { color:var(--grey-light); line-height:1.8; margin-bottom:1.2rem; font-size:0.97rem; }

        .numbers-row { display:grid; grid-template-columns:repeat(3,1fr); gap:1px; background:var(--border); border:1px solid var(--border); }
        .number-box { background:var(--dark2); padding:2rem 1rem; text-align:center; }
        .number-box .num { font-family:'Barlow Condensed',sans-serif; font-size:2.8rem; font-weight:800; color:var(--red); line-height:1; margin-bottom:0.4rem; }
        .number-box .lbl { font-size:0.72rem; color:var(--grey); letter-spacing:1.2px; text-transform:uppercase; font-weight:600; }

        .team-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:1.2rem; margin-bottom:3rem; }
        .team-card { background:var(--dark2); border:1px solid var(--border); border-top:3px solid var(--red); padding:1.5rem; }
        .team-card .initials { width:48px; height:48px; background:var(--red); display:flex; align-items:center; justify-content:center; font-family:'Barlow Condensed',sans-serif; font-size:1.2rem; font-weight:800; margin-bottom:0.8rem; }
        .team-card h3 { font-family:'Barlow Condensed',sans-serif; font-size:1.1rem; font-weight:700; text-transform:uppercase; letter-spacing:1px; margin-bottom:0.2rem; }
        .team-card .rol { font-size:0.75rem; color:var(--red); letter-spacing:1.5px; text-transform:uppercase; font-weight:600; margin-bottom:0.6rem; }
        .team-card p { color:var(--grey); font-size:0.88rem; line-height:1.6; }

        .values-grid { display:grid; grid-template-columns:repeat(2,1fr); gap:1.2rem; margin-bottom:3rem; }
        .value-card { background:var(--dark2); border:1px solid var(--border); padding:1.5rem; }
        .value-card .icon { font-size:1.6rem; margin-bottom:0.8rem; }
        .value-card h3 { font-family:'Barlow Condensed',sans-serif; font-size:1.05rem; font-weight:700; text-transform:uppercase; letter-spacing:1px; margin-bottom:0.4rem; }
        .value-card p { color:var(--grey); font-size:0.88rem; line-height:1.6; }

        .cta-box { text-align:center; padding:2.5rem 1.5rem; background:var(--dark2); border:1px solid var(--border); margin-bottom:2rem; }

        @media(max-width:750px) { .about-grid { grid-template-columns:1fr; } .team-grid { grid-template-columns:1fr; } }
        @media(max-width:500px) { .values-grid { grid-template-columns:1fr; } .numbers-row { grid-template-columns:1fr; } }
    </style>
</head>
<body>

<?php require_once __DIR__ . '/src/views/nav.php'; ?>

<section class="hero-small">
    <div class="section-label">Cine suntem</div>
    <div class="page-title">Despre <span>APG Garage</span></div>
    <div class="page-subtitle"><?= htmlspecialchars($descriere) ?></div>
</section>

<div class="container" style="padding-top:2.5rem;">

    <div class="about-grid">
        <div class="about-text">
            <div class="section-label">Povestea noastră</div>
            <div class="section-title"><?= htmlspecialchars($titlu) ?></div>
            <?php if ($text_1): ?><p><?= nl2br(htmlspecialchars($text_1)) ?></p><?php endif; ?>
            <?php if ($text_2): ?><p><?= nl2br(htmlspecialchars($text_2)) ?></p><?php endif; ?>
            <?php if ($text_3): ?><p><?= nl2br(htmlspecialchars($text_3)) ?></p><?php endif; ?>
        </div>
        <div>
            <div class="numbers-row">
                <div class="number-box"><div class="num">10+</div><div class="lbl">Ani experiență</div></div>
                <div class="number-box"><div class="num">500+</div><div class="lbl">Clienți</div></div>
                <div class="number-box"><div class="num">100%</div><div class="lbl">Transparență</div></div>
            </div>
        </div>
    </div>

    <div style="margin-bottom:3rem;">
        <div class="section-label">Oamenii din spate</div>
        <div class="section-title">Echipa <span>noastră</span></div>
        <div class="team-grid">
            <div class="team-card"><div class="initials">AP</div><h3>Nume Prenume</h3><div class="rol">Mecanic șef</div><p>Peste 15 ani de experiență în diagnosticare și reparații mecanice complexe.</p></div>
            <div class="team-card"><div class="initials">GH</div><h3>Nume Prenume</h3><div class="rol">Mecanic</div><p>Specializat în sisteme de frânare, suspensie și geometrie roți.</p></div>
            <div class="team-card"><div class="initials">MV</div><h3>Nume Prenume</h3><div class="rol">Mecanic</div><p>Expert în motoare și sisteme de alimentare, benzină și diesel.</p></div>
        </div>
    </div>

    <div style="margin-bottom:3rem;">
        <div class="section-label">Ce ne definește</div>
        <div class="section-title">Valorile <span>noastre</span></div>
        <div class="values-grid">
            <div class="value-card"><div class="icon">🔧</div><h3>Calitate</h3><p>Folosim doar piese și materiale de calitate. Nu facem compromisuri cu siguranța mașinii tale.</p></div>
            <div class="value-card"><div class="icon">💬</div><h3>Transparență</h3><p>Îți explicăm clar ce problemă are mașina și ce presupune reparația, înainte să începem.</p></div>
            <div class="value-card"><div class="icon">⏱️</div><h3>Punctualitate</h3><p>Respectăm programările și termenele stabilite. Timpul tău contează.</p></div>
            <div class="value-card"><div class="icon">🛡️</div><h3>Garanție</h3><p>Oferim garanție pentru toate lucrările efectuate.</p></div>
        </div>
    </div>

    <div class="cta-box">
        <div class="section-title">Gata să <span>programezi</span>?</div>
        <p style="color:var(--grey);margin-bottom:1.5rem;">Fă o programare online în câteva minute.</p>
        <a href="/register.php" class="btn btn-primary">Programează-te acum</a>
    </div>

</div>

<footer>© <?= date('Y') ?> APG Garage. Toate drepturile rezervate.</footer>
</body>
</html>
