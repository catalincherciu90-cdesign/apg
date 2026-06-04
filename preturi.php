<?php
require_once __DIR__ . '/src/config/config.php';
require_once __DIR__ . '/src/config/db.php';
require_once __DIR__ . '/src/helpers/Auth.php';

// Incarca preturile active din DB, grupate pe categorii
$stmt   = $pdo->query('SELECT * FROM preturi WHERE activ = 1 ORDER BY ordine ASC, id ASC');
$preturi_raw = $stmt->fetchAll();

$grouped = [];
foreach ($preturi_raw as $p) {
    $grouped[$p['categorie']][] = $p;
}
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
    <title>Prețuri — APG Garage</title>
    <link rel="stylesheet" href="/css/style.css">
    <style>
        .hero-small {
            padding: 3rem 1.5rem 2.5rem;
            border-bottom: 1px solid var(--border);
            background: var(--black);
            position: relative;
            overflow: hidden;
        }
        .hero-small::before {
            content: '';
            position: absolute;
            inset: 0;
            background: repeating-linear-gradient(90deg, transparent, transparent 60px, rgba(255,255,255,0.015) 60px, rgba(255,255,255,0.015) 61px);
        }
        .hero-small > * { position: relative; z-index: 1; }

        .disclaimer {
            background: var(--dark2);
            border: 1px solid var(--border);
            border-left: 4px solid var(--grey);
            padding: 1.2rem 1.5rem;
            color: var(--grey);
            font-size: 0.88rem;
            line-height: 1.6;
            margin-bottom: 2.5rem;
        }

        .price-category { margin-bottom: 2.5rem; }
        .price-category-title {
            font-family: 'Barlow Condensed', sans-serif;
            font-size: 1.2rem;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 1px;
            padding: 0.7rem 1.2rem;
            background: var(--black);
            border-left: 4px solid var(--red);
        }

        .price-list { background: var(--dark2); }
        .price-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            gap: 1rem;
            padding: 0.9rem 1.2rem;
            border-bottom: 1px solid var(--border);
            font-size: 0.92rem;
        }
        .price-item:last-of-type { border-bottom: none; }
        .price-item .serviciu { color: var(--white); flex: 1; }
        .price-item .serviciu .nota { display:block; font-size:0.78rem; color:var(--grey); margin-top:0.1rem; }
        .price-item .pret {
            font-family: 'Barlow Condensed', sans-serif;
            font-size: 1rem;
            font-weight: 700;
            color: var(--red);
            white-space: nowrap;
            text-align: right;
        }

        .cta-banner {
            background: var(--red);
            padding: 3rem 1.5rem;
            text-align: center;
            margin-top: 1rem;
        }
        .cta-banner h2 {
            font-family: 'Barlow Condensed', sans-serif;
            font-size: 1.8rem;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 2px;
            margin-bottom: 0.5rem;
        }
        .cta-banner p { margin-bottom: 1.5rem; opacity: 0.85; font-size: 0.95rem; }
        .btn-white {
            background: var(--white);
            color: var(--red);
            font-family: 'Barlow Condensed', sans-serif;
            font-weight: 800;
            font-size: 1rem;
            letter-spacing: 1.5px;
            text-transform: uppercase;
            padding: 0.8rem 2rem;
            text-decoration: none;
            display: inline-block;
        }

        @media (max-width: 500px) {
            .price-item { flex-direction: column; align-items: flex-start; gap: 0.3rem; }
            .price-item .pret { text-align: left; }
        }
    </style>
</head>
<body>

<?php require_once __DIR__ . '/src/views/nav.php'; ?>

<section class="hero-small">
    <div class="section-label">Tarife orientative</div>
    <div class="page-title">Prețuri</div>
    <div class="page-subtitle">Lista de prețuri orientative pentru principalele servicii oferite.</div>
</section>

<div class="container" style="padding-top:2.5rem;">

    <div class="disclaimer">
        <strong style="color:var(--white);">Notă:</strong> Prețurile sunt orientative și pot varia în funcție de marca și modelul vehiculului. Prețul final se stabilește după diagnosticare. Toate prețurile includ manopera, piesele sunt separate unde este specificat.
    </div>

    <?php if (empty($grouped)): ?>
        <div class="card" style="text-align:center;color:var(--grey);padding:3rem;">
            Prețurile vor fi afișate în curând.
        </div>
    <?php else: ?>
        <?php foreach ($grouped as $categorie => $randuri): ?>
        <div class="price-category">
            <div class="price-category-title"><?= htmlspecialchars($categorie) ?></div>
            <div class="price-list">
                <?php foreach ($randuri as $p): ?>
                <div class="price-item">
                    <span class="serviciu">
                        <?= htmlspecialchars($p['nume']) ?>
                        <?php if ($p['nota']): ?>
                            <span class="nota"><?= htmlspecialchars($p['nota']) ?></span>
                        <?php endif; ?>
                    </span>
                    <span class="pret">
                        de la <?= number_format($p['pret_de_la'], 0) ?> lei<?= $p['include_piese'] ? ' + piese' : '' ?>
                    </span>
                </div>
                <?php endforeach; ?>
            </div>
        </div>
        <?php endforeach; ?>
    <?php endif; ?>

</div>

<div class="cta-banner">
    <h2>Programează o vizită</h2>
    <p>Ai o problemă cu mașina sau vrei o revizie? Fă o programare online acum.</p>
    <a href="/register.php" class="btn-white">Programează-te</a>
</div>

<footer>© <?= date('Y') ?> APG Garage. Toate drepturile rezervate.</footer>
</body>
</html>
