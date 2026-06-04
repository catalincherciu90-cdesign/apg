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

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $actiune = $_POST['actiune'] ?? '';

    // Toggle activ/inactiv
    if ($actiune === 'toggle') {
        $cheie   = $_POST['cheie'] ?? '';
        $valoare = $_POST['valoare'] ?? '0';
        $chei_permise = ['tractari_activ', 'dezmembrari_activ'];
        if (in_array($cheie, $chei_permise)) {
            $pdo->prepare('UPDATE setari SET valoare = ? WHERE cheie = ?')->execute([$valoare, $cheie]);
            $success = 'Setarea a fost salvată.';
        }
    }

    // Salveaza telefon
    if ($actiune === 'telefon') {
        $cheie   = $_POST['cheie'] ?? '';
        $valoare = trim($_POST['valoare'] ?? '');
        $chei_permise = ['tractari_telefon', 'dezmembrari_telefon'];
        if (in_array($cheie, $chei_permise)) {
            $pdo->prepare('UPDATE setari SET valoare = ? WHERE cheie = ?')->execute([$valoare, $cheie]);
            $success = 'Numărul de telefon a fost salvat.';
        }
    }

    // Salveaza mesaj
    if ($actiune === 'mesaj') {
        $cheie   = $_POST['cheie'] ?? '';
        $valoare = trim($_POST['valoare'] ?? '');
        $chei_permise = ['tractari_mesaj', 'dezmembrari_mesaj'];
        if (in_array($cheie, $chei_permise)) {
            $pdo->prepare('UPDATE setari SET valoare = ? WHERE cheie = ?')->execute([$valoare, $cheie]);
            $success = 'Mesajul a fost salvat.';
        }
    }

    // Salveaza titlu
    if ($actiune === 'titlu') {
        $cheie   = $_POST['cheie'] ?? '';
        $valoare = trim($_POST['valoare'] ?? '');
        $chei_permise = ['tractari_titlu', 'dezmembrari_titlu'];
        if (in_array($cheie, $chei_permise)) {
            $pdo->prepare('UPDATE setari SET valoare = ? WHERE cheie = ?')->execute([$valoare, $cheie]);
            $success = 'Titlul a fost salvat.';
        }
    }
}

// Incarca toate setarile
$stmt   = $pdo->query('SELECT * FROM setari');
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
    <title>Setări — Admin APG Garage</title>
    <link rel="stylesheet" href="/css/style.css">
    <style>
        .setare-card {
            background: var(--dark2);
            border: 1px solid var(--border);
            border-left: 4px solid var(--border);
            padding: 1.5rem;
            margin-bottom: 1rem;
            display: flex;
            justify-content: space-between;
            align-items: center;
            gap: 1.5rem;
            flex-wrap: wrap;
        }
        .setare-card.on  { border-left-color: #2ecc71; }
        .setare-card.off { border-left-color: var(--red); }

        .setare-info h3 {
            font-family: 'Barlow Condensed', sans-serif;
            font-size: 1.1rem;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 1px;
            margin-bottom: 0.3rem;
        }
        .setare-info p { color: var(--grey); font-size: 0.85rem; }

        .toggle-wrap { display: flex; align-items: center; gap: 1rem; flex-shrink: 0; }

        /* Toggle switch */
        .toggle-switch {
            position: relative;
            width: 56px;
            height: 28px;
            flex-shrink: 0;
        }
        .toggle-switch input { opacity: 0; width: 0; height: 0; }
        .toggle-slider {
            position: absolute;
            cursor: pointer;
            inset: 0;
            background: #333;
            transition: 0.3s;
            border-radius: 28px;
        }
        .toggle-slider::before {
            content: '';
            position: absolute;
            height: 20px;
            width: 20px;
            left: 4px;
            bottom: 4px;
            background: var(--white);
            transition: 0.3s;
            border-radius: 50%;
        }
        input:checked + .toggle-slider { background: #1e8449; }
        input:checked + .toggle-slider::before { transform: translateX(28px); }

        .toggle-label {
            font-family: 'Barlow Condensed', sans-serif;
            font-size: 0.9rem;
            font-weight: 700;
            letter-spacing: 1px;
            text-transform: uppercase;
            min-width: 80px;
        }
        .toggle-label.on  { color: #2ecc71; }
        .toggle-label.off { color: var(--red); }

        .preview-link {
            color: var(--grey);
            font-size: 0.78rem;
            text-decoration: none;
            border: 1px solid var(--border);
            padding: 0.2rem 0.6rem;
            transition: all 0.15s;
        }
        .preview-link:hover { border-color: var(--red); color: var(--red); }

        .telefon-box {
            display: none;
            background: var(--black);
            border: 1px solid var(--border);
            border-left: 3px solid #f0a500;
            padding: 1rem;
            margin-top: 1rem;
        }
        .telefon-box.visible { display: block; }
        .btn-sm { padding: 0.5rem 1rem; font-size: 0.82rem; }
    </style>
</head>
<body>
<?php require_once __DIR__ . '/../src/views/nav_admin.php'; ?>

<div class="container" style="max-width:750px;">
    <div class="page-title">Setări <span>site</span></div>
    <div class="page-subtitle">Activează sau dezactivează secțiunile publice ale site-ului.</div>

    <?php if ($success): ?>
        <div class="alert alert-success"><?= htmlspecialchars($success) ?></div>
    <?php endif; ?>

    <?php
    $pagini = [
        'tractari' => [
            'titlu'     => 'Pagina Tractări',
            'descriere' => 'Clienții pot vedea și trimite cereri de tractare de pe site.',
            'url'       => '/tractari.php',
        ],
        'dezmembrari' => [
            'titlu'     => 'Pagina Dezmembrări',
            'descriere' => 'Clienții pot vedea mașinile disponibile și cere piese din dezmembrări.',
            'url'       => '/dezmembrari.php',
        ],
    ];

    foreach ($pagini as $slug => $info):
        $cheie_activ   = $slug . '_activ';
        $cheie_telefon = $slug . '_telefon';
        $cheie_mesaj   = $slug . '_mesaj';
        $cheie_titlu   = $slug . '_titlu';
        $activ         = ($setari[$cheie_activ] ?? '1') === '1';
        $telefon       = $setari[$cheie_telefon] ?? '';
        $mesaj         = $setari[$cheie_mesaj] ?? '';
        $titlu         = $setari[$cheie_titlu] ?? 'Serviciu indisponibil';
    ?>
    <div class="setare-card <?= $activ ? 'on' : 'off' ?>" id="card-<?= $cheie_activ ?>">
        <div style="flex:1;">
            <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:1rem;flex-wrap:wrap;margin-bottom:1rem;">
                <div class="setare-info">
                    <h3><?= $info['titlu'] ?></h3>
                    <p><?= $info['descriere'] ?></p>
                    <a href="<?= $info['url'] ?>" target="_blank" class="preview-link" style="display:inline-block;margin-top:0.5rem;">
                        Previzualizează →
                    </a>
                </div>
                <div class="toggle-wrap">
                    <span class="toggle-label <?= $activ ? 'on' : 'off' ?>" id="label-<?= $cheie_activ ?>">
                        <?= $activ ? 'Activă' : 'Inactivă' ?>
                    </span>
                    <form method="POST" id="form-<?= $cheie_activ ?>">
                        <input type="hidden" name="actiune" value="toggle">
                        <input type="hidden" name="cheie" value="<?= $cheie_activ ?>">
                        <input type="hidden" name="valoare" id="val-<?= $cheie_activ ?>" value="<?= $activ ? '1' : '0' ?>">
                        <label class="toggle-switch">
                            <input type="checkbox" <?= $activ ? 'checked' : '' ?>
                                   onchange="toggleSetare('<?= $cheie_activ ?>', this.checked)">
                            <span class="toggle-slider"></span>
                        </label>
                    </form>
                </div>
            </div>

            <!-- Telefon afisat cand e dezactivat -->
            <div class="telefon-box <?= !$activ ? 'visible' : '' ?>" id="tel-box-<?= $slug ?>">
                <form method="POST" style="display:flex;gap:0.8rem;align-items:flex-end;flex-wrap:wrap;margin-bottom:1rem;">
                    <input type="hidden" name="actiune" value="titlu">
                    <input type="hidden" name="cheie" value="<?= $cheie_titlu ?>">
                    <div class="form-group" style="margin:0;flex:1;min-width:200px;">
                        <label>Titlu afișat când serviciul e dezactivat</label>
                        <input type="text" name="valoare" value="<?= htmlspecialchars($titlu) ?>"
                               placeholder="ex: Serviciu indisponibil">
                    </div>
                    <button type="submit" class="btn btn-outline btn-sm" style="margin-bottom:0;">Salvează</button>
                </form>
                <form method="POST" style="display:flex;gap:0.8rem;align-items:flex-end;flex-wrap:wrap;margin-bottom:1rem;">
                    <input type="hidden" name="actiune" value="telefon">
                    <input type="hidden" name="cheie" value="<?= $cheie_telefon ?>">
                    <div class="form-group" style="margin:0;flex:1;min-width:200px;">
                        <label>Telefon afișat când serviciul e dezactivat</label>
                        <input type="text" name="valoare" value="<?= htmlspecialchars($telefon) ?>"
                               placeholder="ex: 0700 000 000">
                    </div>
                    <button type="submit" class="btn btn-outline btn-sm" style="margin-bottom:0;">Salvează</button>
                </form>
                <form method="POST" style="display:flex;gap:0.8rem;align-items:flex-end;flex-wrap:wrap;">
                    <input type="hidden" name="actiune" value="mesaj">
                    <input type="hidden" name="cheie" value="<?= $cheie_mesaj ?>">
                    <div class="form-group" style="margin:0;flex:1;">
                        <label>Mesaj afișat când serviciul e dezactivat</label>
                        <textarea name="valoare" rows="3" placeholder="Scrie mesajul pentru clienți..."
                                  style="resize:vertical;"><?= htmlspecialchars($mesaj) ?></textarea>
                    </div>
                    <button type="submit" class="btn btn-outline btn-sm" style="margin-bottom:0;align-self:flex-end;">Salvează</button>
                </form>
            </div>
        </div>
    </div>
    <?php endforeach; ?>

    <div class="alert alert-info" style="font-size:0.85rem;margin-top:1rem;">
        Când o pagină este dezactivată, clienții văd un mesaj că serviciul nu este disponibil momentan. Linkurile din meniu rămân vizibile.
    </div>
</div>

<footer>© <?= date('Y') ?> APG Garage. Toate drepturile rezervate.</footer>

<script>
function toggleSetare(cheie, activ) {
    document.getElementById('val-' + cheie).value = activ ? '1' : '0';

    const card  = document.getElementById('card-' + cheie);
    const label = document.getElementById('label-' + cheie);
    const slug  = cheie.replace('_activ', '');
    const telBox= document.getElementById('tel-box-' + slug);

    card.classList.toggle('on', activ);
    card.classList.toggle('off', !activ);
    label.className = 'toggle-label ' + (activ ? 'on' : 'off');
    label.textContent = activ ? 'Activă' : 'Inactivă';

    if (telBox) telBox.classList.toggle('visible', !activ);

    document.getElementById('form-' + cheie).submit();
}
</script>
</body>
</html>
