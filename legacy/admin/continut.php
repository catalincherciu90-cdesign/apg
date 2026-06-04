<?php
require_once __DIR__ . '/../src/config/config.php';
require_once __DIR__ . '/../src/config/db.php';
require_once __DIR__ . '/../src/helpers/Auth.php';
require_once __DIR__ . '/../src/helpers/Permisiuni.php';

Auth::requireLogin();
Auth::requireAngajat();

if (!Permisiuni::isSuperAdmin()) {
    header('Location: /admin/index.php?eroare=acces');
    exit;
}

$success = '';
$tab     = $_GET['tab'] ?? 'home';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $chei_home = [
        'home_titlu', 'home_subtitlu', 'home_descriere', 'home_tag',
        'home_despre_titlu', 'home_ani_experienta', 'home_clienti', 'home_timp_revizie'
    ];
    $chei_despre = [
        'despre_titlu', 'despre_descriere',
        'despre_text_1', 'despre_text_2', 'despre_text_3'
    ];

    $chei_permise = array_merge($chei_home, $chei_despre);

    foreach ($chei_permise as $cheie) {
        if (isset($_POST[$cheie])) {
            $valoare = trim($_POST[$cheie]);
            $pdo->prepare('UPDATE setari SET valoare = ? WHERE cheie = ?')
                ->execute([$valoare, $cheie]);
        }
    }
    $success = 'Conținutul a fost salvat.';
    $tab = $_POST['tab_return'] ?? $tab;
}

// Incarca setarile
$stmt = $pdo->query("SELECT cheie, valoare FROM setari WHERE cheie LIKE 'home_%' OR cheie LIKE 'despre_%'");
$s = [];
foreach ($stmt->fetchAll() as $row) {
    $s[$row['cheie']] = $row['valoare'];
}
?>
<!DOCTYPE html>
<html lang="ro">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Conținut site — Admin APG Garage</title>
    <link rel="stylesheet" href="/css/style.css">
    <style>
        .tabs { display:flex; gap:0; border-bottom:2px solid var(--border); margin-bottom:2rem; }
        .tab { padding:0.8rem 1.5rem; font-family:'Barlow Condensed',sans-serif; font-size:0.95rem; font-weight:700; letter-spacing:1px; text-transform:uppercase; text-decoration:none; color:var(--grey); border-bottom:3px solid transparent; margin-bottom:-2px; transition:all 0.15s; }
        .tab:hover { color:var(--white); }
        .tab.active { color:var(--white); border-bottom-color:var(--red); }

        .section-card { background:var(--dark2); border:1px solid var(--border); border-top:4px solid var(--red); padding:1.8rem; margin-bottom:1.5rem; }
        .section-card h3 { font-family:'Barlow Condensed',sans-serif; font-size:1.1rem; font-weight:700; text-transform:uppercase; letter-spacing:1px; margin-bottom:1.2rem; color:var(--white); }

        .fg2 { display:grid; grid-template-columns:1fr 1fr; gap:0 1.5rem; }
        .fg3 { display:grid; grid-template-columns:1fr 1fr 1fr; gap:0 1.5rem; }
        @media(max-width:650px){ .fg2,.fg3 { grid-template-columns:1fr; } }

        .hint { font-size:0.75rem; color:#555; margin-top:0.25rem; }

        .preview-btn { display:inline-block; padding:0.5rem 1.2rem; background:none; border:1px solid var(--border); color:var(--grey); font-family:'Barlow Condensed',sans-serif; font-size:0.85rem; font-weight:700; letter-spacing:1px; text-transform:uppercase; text-decoration:none; transition:all 0.15s; }
        .preview-btn:hover { border-color:var(--red); color:var(--red); }

        .panel { display:none; }
        .panel.active { display:block; }

        .char-count { font-size:0.72rem; color:#555; text-align:right; margin-top:0.2rem; }
    </style>
</head>
<body>
<?php require_once __DIR__ . '/../src/views/nav_admin.php'; ?>

<div class="container" style="max-width:850px;">
    <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:1rem;margin-bottom:0.3rem;">
        <div class="page-title">Conținut <span>site</span></div>
        <div style="display:flex;gap:0.5rem;">
            <a href="/" target="_blank" class="preview-btn">Acasă →</a>
            <a href="/despre.php" target="_blank" class="preview-btn">Despre noi →</a>
        </div>
    </div>
    <div class="page-subtitle">Editează textele afișate pe paginile principale ale site-ului.</div>

    <?php if ($success): ?><div class="alert alert-success"><?= htmlspecialchars($success) ?></div><?php endif; ?>

    <!-- Tabs -->
    <div class="tabs">
        <a href="?tab=home" class="tab <?= $tab === 'home' ? 'active' : '' ?>">Pagina principală</a>
        <a href="?tab=despre" class="tab <?= $tab === 'despre' ? 'active' : '' ?>">Despre noi</a>
    </div>

    <!-- ===== HOMEPAGE ===== -->
    <div class="panel <?= $tab === 'home' ? 'active' : '' ?>">
        <form method="POST">
            <input type="hidden" name="tab_return" value="home">

            <!-- Hero -->
            <div class="section-card">
                <h3>Secțiunea Hero (prima imagine)</h3>
                <div class="form-group">
                    <label>Tag mic deasupra titlului</label>
                    <input type="text" name="home_tag" value="<?= htmlspecialchars($s['home_tag'] ?? '') ?>" placeholder="ex: Servis Auto București">
                    <div class="hint">Apare pe fundal roșu deasupra titlului mare</div>
                </div>
                <div class="fg2">
                    <div class="form-group">
                        <label>Titlu mare (alb)</label>
                        <input type="text" name="home_titlu" value="<?= htmlspecialchars($s['home_titlu'] ?? '') ?>" placeholder="ex: APG">
                    </div>
                    <div class="form-group">
                        <label>Titlu mare (roșu)</label>
                        <input type="text" name="home_subtitlu" value="<?= htmlspecialchars($s['home_subtitlu'] ?? '') ?>" placeholder="ex: Garage">
                    </div>
                </div>
                <div class="form-group">
                    <label>Descriere</label>
                    <textarea name="home_descriere" rows="3"><?= htmlspecialchars($s['home_descriere'] ?? '') ?></textarea>
                    <div class="hint">Textul descriptiv de sub titlu</div>
                </div>
            </div>

            <!-- Statistici -->
            <div class="section-card">
                <h3>Secțiunea statistici</h3>
                <div class="form-group">
                    <label>Titlu secțiune</label>
                    <input type="text" name="home_despre_titlu" value="<?= htmlspecialchars($s['home_despre_titlu'] ?? '') ?>" placeholder="ex: De ce APG Garage">
                </div>
                <div class="fg3">
                    <div class="form-group">
                        <label>Ani experiență</label>
                        <input type="text" name="home_ani_experienta" value="<?= htmlspecialchars($s['home_ani_experienta'] ?? '') ?>" placeholder="ex: 10+">
                        <div class="hint">Numărul afișat mare</div>
                    </div>
                    <div class="form-group">
                        <label>Clienți mulțumiți</label>
                        <input type="text" name="home_clienti" value="<?= htmlspecialchars($s['home_clienti'] ?? '') ?>" placeholder="ex: 500+">
                    </div>
                    <div class="form-group">
                        <label>Timp mediu revizie</label>
                        <input type="text" name="home_timp_revizie" value="<?= htmlspecialchars($s['home_timp_revizie'] ?? '') ?>" placeholder="ex: 2h">
                    </div>
                </div>
            </div>

            <button type="submit" class="btn btn-primary" style="width:100%;">Salvează pagina principală</button>
        </form>
    </div>

    <!-- ===== DESPRE NOI ===== -->
    <div class="panel <?= $tab === 'despre' ? 'active' : '' ?>">
        <form method="POST">
            <input type="hidden" name="tab_return" value="despre">

            <!-- Header -->
            <div class="section-card">
                <h3>Header pagină</h3>
                <div class="form-group">
                    <label>Titlu pagină</label>
                    <input type="text" name="despre_titlu" value="<?= htmlspecialchars($s['despre_titlu'] ?? '') ?>" placeholder="ex: Despre APG Garage">
                </div>
                <div class="form-group">
                    <label>Subtitlu / descriere scurtă</label>
                    <input type="text" name="despre_descriere" value="<?= htmlspecialchars($s['despre_descriere'] ?? '') ?>" placeholder="ex: Un servis auto cu experiență...">
                </div>
            </div>

            <!-- Paragrafe -->
            <div class="section-card">
                <h3>Povestea noastră</h3>
                <div class="form-group">
                    <label>Paragraful 1</label>
                    <textarea name="despre_text_1" rows="4"><?= htmlspecialchars($s['despre_text_1'] ?? '') ?></textarea>
                </div>
                <div class="form-group">
                    <label>Paragraful 2</label>
                    <textarea name="despre_text_2" rows="4"><?= htmlspecialchars($s['despre_text_2'] ?? '') ?></textarea>
                </div>
                <div class="form-group">
                    <label>Paragraful 3</label>
                    <textarea name="despre_text_3" rows="4"><?= htmlspecialchars($s['despre_text_3'] ?? '') ?></textarea>
                </div>
            </div>

            <button type="submit" class="btn btn-primary" style="width:100%;">Salvează pagina Despre noi</button>
        </form>
    </div>

</div>

<footer>© <?= date('Y') ?> APG Garage. Toate drepturile rezervate.</footer>
</body>
</html>
