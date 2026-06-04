<?php
require_once __DIR__ . '/src/config/config.php';
require_once __DIR__ . '/src/config/db.php';
require_once __DIR__ . '/src/helpers/Auth.php';
require_once __DIR__ . '/src/helpers/Mailer.php';

// Verifica daca pagina e activa
$stmt = $pdo->prepare('SELECT valoare FROM setari WHERE cheie = "tractari_activ"');
$stmt->execute();
$row = $stmt->fetch();
$tractari_activ = ($row['valoare'] ?? '1') === '1';

$stmt_tel = $pdo->prepare('SELECT valoare FROM setari WHERE cheie = "tractari_telefon"');
$stmt_tel->execute();
$row_tel = $stmt_tel->fetch();
$tractari_telefon = $row_tel['valoare'] ?? '';

$stmt_msg = $pdo->prepare('SELECT valoare FROM setari WHERE cheie = "tractari_mesaj"');
$stmt_msg->execute();
$row_msg = $stmt_msg->fetch();
$tractari_mesaj = $row_msg['valoare'] ?? 'Serviciul de tractări nu este disponibil momentan. Contactează-ne direct pentru urgențe.';

$stmt_titlu = $pdo->prepare('SELECT valoare FROM setari WHERE cheie = "tractari_titlu"');
$stmt_titlu->execute();
$row_titlu = $stmt_titlu->fetch();
$tractari_titlu = $row_titlu['valoare'] ?? 'Serviciu indisponibil';

$success = false;
$error   = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $nume        = trim($_POST['nume'] ?? '');
    $telefon     = trim($_POST['telefon'] ?? '');
    $locatie     = trim($_POST['locatie'] ?? '');
    $nr_inmatr   = strtoupper(trim($_POST['nr_inmatriculare'] ?? ''));
    $producator  = trim($_POST['producator'] ?? '');
    $model       = trim($_POST['model'] ?? '');
    $descriere   = trim($_POST['descriere_problema'] ?? '');
    $user_id     = Auth::isLoggedIn() ? $_SESSION['user_id'] : null;

    if (!$nume || !$telefon || !$locatie) {
        $error = 'Completează numele, telefonul și locația.';
    } else {
        $pdo->prepare('INSERT INTO tractari (user_id, nume, telefon, locatie, nr_inmatriculare, producator, model, descriere_problema) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
            ->execute([$user_id, $nume, $telefon, $locatie, $nr_inmatr, $producator, $model, $descriere]);

        // Notificare admin
        $continut = '
            <p>O nouă cerere de tractare a fost înregistrată.</p>
            <table class="info-table">
                <tr><td>Nume</td><td>' . htmlspecialchars($nume) . '</td></tr>
                <tr><td>Telefon</td><td>' . htmlspecialchars($telefon) . '</td></tr>
                <tr><td>Locație</td><td>' . htmlspecialchars($locatie) . '</td></tr>
                <tr><td>Mașina</td><td>' . htmlspecialchars($nr_inmatr . ' ' . $producator . ' ' . $model) . '</td></tr>
                <tr><td>Problemă</td><td>' . htmlspecialchars($descriere ?: '—') . '</td></tr>
            </table>
            <a href="https://apg-garage.ro/admin/tractari.php" class="btn">Vezi cererea în admin</a>
        ';
        trimiteEmail(MAIL_ADMIN, 'Cerere tractare nouă — ' . $nume, emailTemplate('Cerere tractare nouă', $continut));

        $success = true;
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
    <title>Tractări auto — APG Garage</title>
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

        .tractare-grid {
            display: grid;
            grid-template-columns: 1fr 1.3fr;
            gap: 2.5rem;
            align-items: start;
        }
        @media (max-width: 750px) { .tractare-grid { grid-template-columns: 1fr; } }

        .info-box {
            background: var(--dark2);
            border: 1px solid var(--border);
            border-top: 4px solid var(--red);
            padding: 1.5rem;
            margin-bottom: 1.2rem;
        }
        .info-box h3 {
            font-family: 'Barlow Condensed', sans-serif;
            font-size: 1.1rem;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 1px;
            margin-bottom: 0.8rem;
        }
        .info-item {
            display: flex;
            align-items: flex-start;
            gap: 0.8rem;
            padding: 0.7rem 0;
            border-bottom: 1px solid var(--border);
            font-size: 0.9rem;
        }
        .info-item:last-child { border-bottom: none; }
        .info-item .icon { font-size: 1.2rem; flex-shrink: 0; }
        .info-item .text { color: var(--grey-light); line-height: 1.5; }
        .info-item .text strong { color: var(--white); display: block; font-size: 0.8rem; margin-bottom: 0.1rem; }

        .masina-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0 1rem; }
        @media (max-width: 500px) { .masina-grid { grid-template-columns: 1fr; } }

        .success-box { text-align: center; padding: 3rem 1.5rem; }
        .success-box .ico { font-size: 3rem; margin-bottom: 1rem; }
        .success-box h2 { font-family: 'Barlow Condensed', sans-serif; font-size: 1.8rem; font-weight: 800; text-transform: uppercase; margin-bottom: 0.5rem; }
        .success-box p { color: var(--grey); margin-bottom: 1.5rem; }

        .urgenta-bar {
            background: var(--red);
            padding: 0.8rem 1.5rem;
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 1rem;
            flex-wrap: wrap;
        }
        .urgenta-bar p { font-size: 0.9rem; font-weight: 600; }
        .urgenta-bar a { color: var(--white); font-family: 'Barlow Condensed', sans-serif; font-size: 1rem; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; text-decoration: none; background: rgba(0,0,0,0.3); padding: 0.4rem 1rem; white-space: nowrap; }
    </style>
</head>
<body>

<?php require_once __DIR__ . '/src/views/nav.php'; ?>

<?php if (!$tractari_activ): ?>
<div class="container" style="padding-top:4rem;padding-bottom:4rem;text-align:center;">
    <div style="font-size:3rem;margin-bottom:1rem;">🚛</div>
    <div class="page-title" style="margin-bottom:0.5rem;"><?= htmlspecialchars($tractari_titlu) ?></div>
    <p style="color:var(--grey);margin-bottom:1.5rem;max-width:480px;margin-left:auto;margin-right:auto;line-height:1.7;">
        <?= nl2br(htmlspecialchars($tractari_mesaj)) ?>
    </p>
    <?php if ($tractari_telefon): ?>
        <a href="tel:<?= preg_replace('/\s+/', '', $tractari_telefon) ?>" class="btn btn-primary" style="font-size:1.1rem;">
            📞 <?= htmlspecialchars($tractari_telefon) ?>
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

<!-- Bara urgenta -->
<div class="urgenta-bar">
    <p>🚨 Ai nevoie urgentă de tractare? Sună-ne direct!</p>
    <a href="tel:+40700000000">📞 0700 000 000</a>
</div>

<section class="hero-small">
    <div class="section-label">Serviciu non-stop</div>
    <div class="page-title">Tractări <span>auto</span></div>
    <div class="page-subtitle">Completează formularul și te contactăm în cel mai scurt timp.</div>
</section>

<div class="container" style="padding-top:2.5rem;">
    <div class="tractare-grid">

        <!-- Stanga: info -->
        <div>
            <div class="info-box">
                <h3>Cum funcționează?</h3>
                <div class="info-item">
                    <div class="icon">📋</div>
                    <div class="text"><strong>1. Completezi formularul</strong>Introduci locația, datele mașinii și descrii problema.</div>
                </div>
                <div class="info-item">
                    <div class="icon">📞</div>
                    <div class="text"><strong>2. Te sunăm înapoi</strong>Echipa noastră te contactează în cel mai scurt timp pentru a confirma.</div>
                </div>
                <div class="info-item">
                    <div class="icon">🚛</div>
                    <div class="text"><strong>3. Trimitem mașina de tractare</strong>Ajungem la locația ta și transportăm vehiculul în siguranță la servis.</div>
                </div>
            </div>

            <div class="info-box">
                <h3>Zonele de acoperire</h3>
                <div class="info-item">
                    <div class="icon">📍</div>
                    <div class="text"><strong>București și Ilfov</strong>Acoperire completă în toată zona metropolitană.</div>
                </div>
                <div class="info-item">
                    <div class="icon">🕐</div>
                    <div class="text"><strong>Program</strong>Luni — Vineri: 08:00 — 20:00<br>Weekend: la cerere</div>
                </div>
            </div>
        </div>

        <!-- Dreapta: formular -->
        <div>
            <?php if ($success): ?>
                <div class="card success-box">
                    <div class="ico">✓</div>
                    <h2>Cerere <span style="color:var(--red)">trimisă!</span></h2>
                    <p>Am primit cererea ta. Te vom contacta în cel mai scurt timp la numărul de telefon furnizat.</p>
                    <a href="/" class="btn btn-primary">Înapoi acasă</a>
                </div>
            <?php else: ?>
                <?php if ($error): ?>
                    <div class="alert alert-error"><?= htmlspecialchars($error) ?></div>
                <?php endif; ?>
                <div class="card">
                    <form method="POST">
                        <div class="section-label" style="margin-bottom:1rem;">Date contact</div>
                        <div class="masina-grid">
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
                            <label>Locația mașinii * <span style="color:var(--grey);font-weight:400;text-transform:none;letter-spacing:0;">(adresă sau reper)</span></label>
                            <input type="text" name="locatie" value="<?= htmlspecialchars($_POST['locatie'] ?? '') ?>" placeholder="ex: Str. Exemplu nr. 10, Sector 1 / lângă mall Băneasa" required>
                        </div>

                        <div class="section-label" style="margin:1.2rem 0 1rem;">Datele mașinii</div>
                        <div class="form-group">
                            <label>Număr înmatriculare</label>
                            <input type="text" name="nr_inmatriculare" value="<?= htmlspecialchars($_POST['nr_inmatriculare'] ?? '') ?>" placeholder="ex: B 123 ABC" style="text-transform:uppercase;">
                        </div>
                        <div class="masina-grid">
                            <div class="form-group">
                                <label>Producător</label>
                                <input type="text" name="producator" value="<?= htmlspecialchars($_POST['producator'] ?? '') ?>" placeholder="ex: Volkswagen">
                            </div>
                            <div class="form-group">
                                <label>Model</label>
                                <input type="text" name="model" value="<?= htmlspecialchars($_POST['model'] ?? '') ?>" placeholder="ex: Golf 7">
                            </div>
                        </div>

                        <div class="form-group">
                            <label>Descriere problemă</label>
                            <textarea name="descriere_problema" rows="4" placeholder="Descrie pe scurt ce s-a întâmplat cu mașina..."><?= htmlspecialchars($_POST['descriere_problema'] ?? '') ?></textarea>
                        </div>

                        <button type="submit" class="btn btn-primary" style="width:100%;">Trimite cererea de tractare</button>
                    </form>
                </div>
            <?php endif; ?>
        </div>
    </div>
</div>

<footer>© <?= date('Y') ?> APG Garage. Toate drepturile rezervate.</footer>
</body>
</html>
