<?php
require_once __DIR__ . '/src/config/config.php';
require_once __DIR__ . '/src/config/db.php';
require_once __DIR__ . '/src/helpers/Auth.php';
require_once __DIR__ . '/src/helpers/Mailer.php';

// Verifica daca pagina e activa
$stmt = $pdo->prepare('SELECT valoare FROM setari WHERE cheie = "dezmembrari_activ"');
$stmt->execute();
$row = $stmt->fetch();
$dezmembrari_activ = ($row['valoare'] ?? '1') === '1';

$stmt_tel = $pdo->prepare('SELECT valoare FROM setari WHERE cheie = "dezmembrari_telefon"');
$stmt_tel->execute();
$row_tel = $stmt_tel->fetch();
$dezmembrari_telefon = $row_tel['valoare'] ?? '';

$stmt_msg = $pdo->prepare('SELECT valoare FROM setari WHERE cheie = "dezmembrari_mesaj"');
$stmt_msg->execute();
$row_msg = $stmt_msg->fetch();
$dezmembrari_mesaj = $row_msg['valoare'] ?? 'Secțiunea de piese din dezmembrări nu este disponibilă momentan. Revino în curând sau contactează-ne direct.';

$stmt_titlu = $pdo->prepare('SELECT valoare FROM setari WHERE cheie = "dezmembrari_titlu"');
$stmt_titlu->execute();
$row_titlu = $stmt_titlu->fetch();
$dezmembrari_titlu = $row_titlu['valoare'] ?? 'Serviciu indisponibil';

$success     = false;
$error       = '';
$selected_id = intval($_GET['masina'] ?? 0);

// Incarca masinile disponibile la dezmembrat
$masini_dezm = $pdo->query("SELECT * FROM dezmembrari WHERE activ = 1 ORDER BY producator, model")->fetchAll();

// Cerere piesa
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $dezm_id = intval($_POST['dezmembrare_id'] ?? 0);
    $nume    = trim($_POST['nume'] ?? '');
    $telefon = trim($_POST['telefon'] ?? '');
    $piesa   = trim($_POST['piesa_dorita'] ?? '');
    $user_id = Auth::isLoggedIn() ? $_SESSION['user_id'] : null;

    if (!$nume || !$telefon || !$piesa || !$dezm_id) {
        $error = 'Completează toate câmpurile obligatorii.';
    } else {
        // Verifica masina
        $stmt = $pdo->prepare('SELECT * FROM dezmembrari WHERE id = ? AND activ = 1');
        $stmt->execute([$dezm_id]);
        $masina_dezm = $stmt->fetch();

        if (!$masina_dezm) {
            $error = 'Mașina selectată nu mai este disponibilă.';
        } else {
            $pdo->prepare('INSERT INTO cereri_piese (user_id, dezmembrare_id, nume, telefon, piesa_dorita) VALUES (?, ?, ?, ?, ?)')
                ->execute([$user_id, $dezm_id, $nume, $telefon, $piesa]);

            // Notificare admin
            $continut = '
                <p>O nouă cerere de piesă din dezmembrări a fost înregistrată.</p>
                <table class="info-table">
                    <tr><td>Client</td><td>' . htmlspecialchars($nume) . '</td></tr>
                    <tr><td>Telefon</td><td>' . htmlspecialchars($telefon) . '</td></tr>
                    <tr><td>Mașina dezmembrată</td><td>' . htmlspecialchars($masina_dezm['producator'] . ' ' . $masina_dezm['model'] . ' ' . $masina_dezm['an_fabricatie']) . '</td></tr>
                    <tr><td>Piesa dorită</td><td>' . htmlspecialchars($piesa) . '</td></tr>
                </table>
                <a href="https://apg-garage.ro/admin/dezmembrari.php" class="btn">Vezi cererea în admin</a>
            ';
            trimiteEmail(MAIL_ADMIN, 'Cerere piesă dezmembrări — ' . $nume, emailTemplate('Cerere piesă nouă', $continut));

            $success      = true;
            $selected_id  = 0;
        }
    }
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
    <title>Piese din dezmembrări — APG Garage</title>
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

        .dezm-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
            gap: 1.2rem;
            margin-bottom: 2.5rem;
        }

        .dezm-card {
            background: var(--dark2);
            border: 1px solid var(--border);
            border-top: 4px solid var(--border);
            padding: 1.5rem;
            cursor: pointer;
            transition: all 0.2s;
            position: relative;
        }
        .dezm-card:hover { border-color: var(--red); }
        .dezm-card.selected { border-color: var(--red); border-top-color: var(--red); background: rgba(192,57,43,0.05); }

        .dezm-card h3 {
            font-family: 'Barlow Condensed', sans-serif;
            font-size: 1.3rem;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 1px;
            margin-bottom: 0.3rem;
        }
        .dezm-card .an { color: var(--red); font-size: 0.85rem; font-weight: 600; margin-bottom: 0.8rem; }
        .dezm-card .motorizare { color: var(--grey); font-size: 0.85rem; margin-bottom: 0.8rem; }
        .dezm-card .descriere { color: var(--grey-light); font-size: 0.85rem; line-height: 1.6; }

        .selected-badge {
            position: absolute;
            top: 0.8rem;
            right: 0.8rem;
            background: var(--red);
            color: var(--white);
            font-size: 0.68rem;
            font-weight: 700;
            letter-spacing: 1px;
            text-transform: uppercase;
            padding: 0.2rem 0.6rem;
        }

        .btn-cerere {
            display: block;
            width: 100%;
            margin-top: 1rem;
            padding: 0.5rem;
            background: none;
            border: 1px solid var(--border);
            color: var(--grey);
            font-family: 'Barlow Condensed', sans-serif;
            font-size: 0.88rem;
            font-weight: 700;
            letter-spacing: 1px;
            text-transform: uppercase;
            cursor: pointer;
            transition: all 0.15s;
            text-align: center;
        }
        .btn-cerere:hover, .dezm-card.selected .btn-cerere { border-color: var(--red); color: var(--red); }
        .dezm-card.selected .btn-cerere { background: var(--red); color: var(--white); }

        .cerere-section {
            background: var(--dark2);
            border: 1px solid var(--border);
            border-top: 4px solid var(--red);
            padding: 2rem;
            margin-bottom: 2rem;
            display: none;
        }
        .cerere-section.visible { display: block; }

        .cerere-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 1.5rem;
            flex-wrap: wrap;
            gap: 0.5rem;
        }
        .cerere-header h3 {
            font-family: 'Barlow Condensed', sans-serif;
            font-size: 1.3rem;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 1px;
        }
        .cerere-header h3 span { color: var(--red); }

        .masina-info-tag {
            background: var(--black);
            border: 1px solid var(--border);
            padding: 0.4rem 0.9rem;
            font-size: 0.82rem;
            color: var(--grey-light);
        }
        .masina-info-tag strong { color: var(--white); }

        .fg2 { display: grid; grid-template-columns: 1fr 1fr; gap: 0 1rem; }
        @media (max-width: 500px) { .fg2 { grid-template-columns: 1fr; } }

        .empty-state { text-align: center; padding: 4rem 2rem; color: var(--grey); }
        .empty-state p { margin-bottom: 1rem; }

        .success-box { text-align: center; padding: 3rem 1.5rem; background: var(--dark2); border: 1px solid var(--border); }
        .success-box .ico { font-size: 3rem; margin-bottom: 1rem; }
        .success-box h2 { font-family: 'Barlow Condensed', sans-serif; font-size: 1.8rem; font-weight: 800; text-transform: uppercase; margin-bottom: 0.5rem; }
        .success-box p { color: var(--grey); margin-bottom: 1.5rem; }
    </style>
</head>
<body>

<?php require_once __DIR__ . '/src/views/nav.php'; ?>

<?php if (!$dezmembrari_activ): ?>
<div class="container" style="padding-top:4rem;padding-bottom:4rem;text-align:center;">
    <div style="font-size:3rem;margin-bottom:1rem;">🔧</div>
    <div class="page-title" style="margin-bottom:0.5rem;"><?= htmlspecialchars($dezmembrari_titlu) ?></div>
    <p style="color:var(--grey);margin-bottom:1.5rem;max-width:480px;margin-left:auto;margin-right:auto;line-height:1.7;">
        <?= nl2br(htmlspecialchars($dezmembrari_mesaj)) ?>
    </p>
    <?php if ($dezmembrari_telefon): ?>
        <a href="tel:<?= preg_replace('/\s+/', '', $dezmembrari_telefon) ?>" class="btn btn-primary" style="font-size:1.1rem;">
            📞 <?= htmlspecialchars($dezmembrari_telefon) ?>
        </a>
    <?php else: ?>
        <a href="/contact.php" class="btn btn-primary">Contactează-ne</a>
    <?php endif; ?>
</div>
<footer>© <?= date('Y') ?> APG Garage. Toate drepturile rezervate.</footer>
</body>
</html>
<?php exit; ?>
<?php endif; ?>

<section class="hero-small">
    <div class="section-label">Piese second-hand</div>
    <div class="page-title">Piese din <span>dezmembrări</span></div>
    <div class="page-subtitle">Alege mașina dezmembrată și întreabă despre piesa de care ai nevoie.</div>
</section>

<div class="container" style="padding-top:2.5rem;">

    <?php if ($success): ?>
        <div class="success-box" style="margin-bottom:2rem;">
            <div class="ico">✓</div>
            <h2>Cerere <span style="color:var(--red)">trimisă!</span></h2>
            <p>Am primit cererea ta. Te vom contacta în cel mai scurt timp cu disponibilitatea piesei.</p>
            <a href="/dezmembrari.php" class="btn btn-primary">Caută alte piese</a>
        </div>
    <?php endif; ?>

    <?php if ($error): ?>
        <div class="alert alert-error"><?= htmlspecialchars($error) ?></div>
    <?php endif; ?>

    <?php if (empty($masini_dezm)): ?>
        <div class="empty-state">
            <p>Momentan nu avem mașini disponibile la dezmembrat.</p>
            <p>Revino în curând sau contactează-ne direct.</p>
            <a href="/contact.php" class="btn btn-outline">Contactează-ne</a>
        </div>
    <?php else: ?>

        <div class="section-label" style="margin-bottom:1rem;">Mașini disponibile la dezmembrat</div>
        <p style="color:var(--grey);font-size:0.88rem;margin-bottom:1.5rem;">Click pe o mașină pentru a cere o piesă specifică.</p>

        <div class="dezm-grid" id="dezm-grid">
            <?php foreach ($masini_dezm as $m): ?>
            <div class="dezm-card <?= ($selected_id === $m['id']) ? 'selected' : '' ?>"
                 id="card-<?= $m['id'] ?>"
                 onclick="selectMasina(<?= $m['id'] ?>, '<?= htmlspecialchars(addslashes($m['producator'] . ' ' . $m['model'] . ' ' . $m['an_fabricatie'])) ?>')">
                <?php if ($selected_id === $m['id']): ?>
                    <div class="selected-badge">Selectată</div>
                <?php endif; ?>
                <h3><?= htmlspecialchars($m['producator']) ?> <?= htmlspecialchars($m['model']) ?></h3>
                <div class="an"><?= htmlspecialchars($m['an_fabricatie'] ?: '—') ?></div>
                <?php if ($m['motorizare']): ?>
                    <div class="motorizare">Motor: <?= htmlspecialchars($m['motorizare']) ?></div>
                <?php endif; ?>
                <?php if ($m['descriere']): ?>
                    <div class="descriere"><?= htmlspecialchars($m['descriere']) ?></div>
                <?php endif; ?>
                <button class="btn-cerere" onclick="event.stopPropagation(); selectMasina(<?= $m['id'] ?>, '<?= htmlspecialchars(addslashes($m['producator'] . ' ' . $m['model'] . ' ' . $m['an_fabricatie'])) ?>')">
                    Cer o piesă →
                </button>
            </div>
            <?php endforeach; ?>
        </div>

        <!-- Formular cerere piesa -->
        <div class="cerere-section <?= $selected_id ? 'visible' : '' ?>" id="cerere-section">
            <div class="cerere-header">
                <h3>Cerere piesă — <span id="masina-selectata-text"><?php
                    if ($selected_id) {
                        foreach ($masini_dezm as $m) {
                            if ($m['id'] === $selected_id) {
                                echo htmlspecialchars($m['producator'] . ' ' . $m['model'] . ' ' . $m['an_fabricatie']);
                                break;
                            }
                        }
                    }
                ?></span></h3>
                <button onclick="deselectMasina()" style="background:none;border:1px solid var(--border);color:var(--grey);padding:0.3rem 0.7rem;cursor:pointer;font-size:0.82rem;">✕ Anulează</button>
            </div>
            <form method="POST" id="cerere-form">
                <input type="hidden" name="dezmembrare_id" id="dezm-id-input" value="<?= $selected_id ?>">
                <div class="fg2">
                    <div class="form-group">
                        <label>Nume complet *</label>
                        <input type="text" name="nume" value="<?= htmlspecialchars($_POST['nume'] ?? (Auth::isLoggedIn() ? $_SESSION['user_nume'] : '')) ?>" required>
                    </div>
                    <div class="form-group">
                        <label>Telefon *</label>
                        <input type="tel" name="telefon" value="<?= htmlspecialchars($_POST['telefon'] ?? '') ?>" required>
                    </div>
                </div>
                <div class="form-group">
                    <label>Piesa dorită *</label>
                    <textarea name="piesa_dorita" rows="3" placeholder="ex: Ușă față dreapta, oglindă, motor complet, cutie viteze..." required><?= htmlspecialchars($_POST['piesa_dorita'] ?? '') ?></textarea>
                </div>
                <button type="submit" class="btn btn-primary">Trimite cererea</button>
            </form>
        </div>

    <?php endif; ?>
</div>

<footer>© <?= date('Y') ?> APG Garage. Toate drepturile rezervate.</footer>

<script>
function selectMasina(id, nume) {
    document.querySelectorAll('.dezm-card').forEach(c => c.classList.remove('selected'));
    document.querySelectorAll('.selected-badge').forEach(b => b.remove());

    const card = document.getElementById('card-' + id);
    card.classList.add('selected');

    const badge = document.createElement('div');
    badge.className = 'selected-badge';
    badge.textContent = 'Selectată';
    card.prepend(badge);

    document.getElementById('dezm-id-input').value = id;
    document.getElementById('masina-selectata-text').textContent = nume;
    document.getElementById('cerere-section').classList.add('visible');

    document.getElementById('cerere-section').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function deselectMasina() {
    document.querySelectorAll('.dezm-card').forEach(c => c.classList.remove('selected'));
    document.querySelectorAll('.selected-badge').forEach(b => b.remove());
    document.getElementById('cerere-section').classList.remove('visible');
    document.getElementById('dezm-id-input').value = '';
}
</script>
</body>
</html>
