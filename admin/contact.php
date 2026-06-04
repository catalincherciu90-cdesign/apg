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
$error   = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $chei_permise = [
        'contact_adresa', 'contact_telefon', 'contact_email',
        'contact_program_sapt', 'contact_program_ore', 'contact_maps_url'
    ];

    foreach ($chei_permise as $cheie) {
        if (isset($_POST[$cheie])) {
            $valoare = trim($_POST[$cheie]);
            $pdo->prepare('UPDATE setari SET valoare = ? WHERE cheie = ?')
                ->execute([$valoare, $cheie]);
        }
    }
    $success = 'Datele de contact au fost salvate.';
}

// Incarca setarile
$stmt = $pdo->query("SELECT cheie, valoare FROM setari WHERE cheie LIKE 'contact_%'");
$setari = [];
foreach ($stmt->fetchAll() as $s) {
    $setari[$s['cheie']] = $s['valoare'];
}
?>
<!DOCTYPE html>
<html lang="ro">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Date contact — Admin APG Garage</title>
    <link rel="stylesheet" href="/css/style.css">
    <style>
        .preview-btn {
            display:inline-block; padding:0.5rem 1.2rem; background:none;
            border:1px solid var(--border); color:var(--grey);
            font-family:'Barlow Condensed',sans-serif; font-size:0.85rem;
            font-weight:700; letter-spacing:1px; text-transform:uppercase;
            text-decoration:none; transition:all 0.15s;
        }
        .preview-btn:hover { border-color:var(--red); color:var(--red); }
        .fg2 { display:grid; grid-template-columns:1fr 1fr; gap:0 1.5rem; }
        @media(max-width:600px){ .fg2 { grid-template-columns:1fr; } }
        .hint { font-size:0.75rem; color:#555; margin-top:0.25rem; }
        .maps-preview {
            width:100%; height:200px; background:var(--black);
            border:1px solid var(--border); margin-top:0.5rem;
            display:flex; align-items:center; justify-content:center;
            color:var(--grey); font-size:0.85rem;
        }
    </style>
</head>
<body>
<?php require_once __DIR__ . '/../src/views/nav_admin.php'; ?>

<div class="container" style="max-width:800px;">
    <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:1rem;margin-bottom:0.3rem;">
        <div class="page-title">Date de <span>contact</span></div>
        <a href="/contact.php" target="_blank" class="preview-btn">Previzualizează →</a>
    </div>
    <div class="page-subtitle">Editează informațiile afișate pe pagina de contact.</div>

    <?php if ($success): ?><div class="alert alert-success"><?= htmlspecialchars($success) ?></div><?php endif; ?>
    <?php if ($error):   ?><div class="alert alert-error"><?= htmlspecialchars($error) ?></div><?php endif; ?>

    <form method="POST">

        <!-- Informatii principale -->
        <div class="card">
            <div class="card-label" style="font-size:0.7rem;font-weight:700;letter-spacing:3px;text-transform:uppercase;color:var(--red);margin-bottom:1rem;padding-bottom:0.4rem;border-bottom:1px solid var(--border);">Informații principale</div>
            <div class="form-group">
                <label>Adresă</label>
                <input type="text" name="contact_adresa"
                       value="<?= htmlspecialchars($setari['contact_adresa'] ?? '') ?>"
                       placeholder="ex: Strada Exemplu, Nr. 00, București, Sector 0">
            </div>
            <div class="fg2">
                <div class="form-group">
                    <label>Telefon</label>
                    <input type="text" name="contact_telefon"
                           value="<?= htmlspecialchars($setari['contact_telefon'] ?? '') ?>"
                           placeholder="ex: 0700 000 000">
                    <div class="hint">Afișat ca link de apel direct pe mobil</div>
                </div>
                <div class="form-group">
                    <label>Email</label>
                    <input type="email" name="contact_email"
                           value="<?= htmlspecialchars($setari['contact_email'] ?? '') ?>"
                           placeholder="ex: contact@apg-garage.ro">
                </div>
            </div>
        </div>

        <!-- Program -->
        <div class="card">
            <div class="card-label" style="font-size:0.7rem;font-weight:700;letter-spacing:3px;text-transform:uppercase;color:var(--red);margin-bottom:1rem;padding-bottom:0.4rem;border-bottom:1px solid var(--border);">Program de lucru</div>
            <div class="fg2">
                <div class="form-group">
                    <label>Zilele săptămânii</label>
                    <input type="text" name="contact_program_sapt"
                           value="<?= htmlspecialchars($setari['contact_program_sapt'] ?? '') ?>"
                           placeholder="ex: Luni — Vineri">
                </div>
                <div class="form-group">
                    <label>Orele</label>
                    <input type="text" name="contact_program_ore"
                           value="<?= htmlspecialchars($setari['contact_program_ore'] ?? '') ?>"
                           placeholder="ex: 09:00 — 17:00">
                </div>
            </div>
        </div>

        <!-- Google Maps -->
        <div class="card">
            <div class="card-label" style="font-size:0.7rem;font-weight:700;letter-spacing:3px;text-transform:uppercase;color:var(--red);margin-bottom:1rem;padding-bottom:0.4rem;border-bottom:1px solid var(--border);">Google Maps</div>
            <div class="form-group">
                <label>URL embed Google Maps</label>
                <input type="text" name="contact_maps_url"
                       value="<?= htmlspecialchars($setari['contact_maps_url'] ?? '') ?>"
                       placeholder="https://www.google.com/maps/embed?pb=..."
                       id="maps-url-input"
                       oninput="updateMapsPreview(this.value)">
                <div class="hint">
                    Mergi pe Google Maps → caută adresa → Share → Embed a map → copiază URL-ul din src="..."
                </div>
            </div>
            <!-- Preview harta -->
            <div id="maps-preview-wrap">
                <?php if (!empty($setari['contact_maps_url'])): ?>
                    <iframe src="<?= htmlspecialchars($setari['contact_maps_url']) ?>"
                            width="100%" height="200" style="border:0;" allowfullscreen="" loading="lazy"></iframe>
                <?php else: ?>
                    <div class="maps-preview" id="maps-placeholder">
                        🗺️ Harta va apărea aici după ce introduci URL-ul
                    </div>
                <?php endif; ?>
            </div>
        </div>

        <button type="submit" class="btn btn-primary" style="width:100%;">Salvează datele de contact</button>
    </form>
</div>

<footer>© <?= date('Y') ?> APG Garage. Toate drepturile rezervate.</footer>

<script>
function updateMapsPreview(url) {
    const wrap = document.getElementById('maps-preview-wrap');
    if (url.trim()) {
        wrap.innerHTML = '<iframe src="' + url + '" width="100%" height="200" style="border:0;" allowfullscreen="" loading="lazy"></iframe>';
    } else {
        wrap.innerHTML = '<div class="maps-preview" id="maps-placeholder">🗺️ Harta va apărea aici după ce introduci URL-ul</div>';
    }
}
</script>
</body>
</html>
