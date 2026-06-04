<?php
require_once __DIR__ . '/src/config/config.php';
require_once __DIR__ . '/src/config/db.php';
require_once __DIR__ . '/src/helpers/Auth.php';

// Incarca datele de contact din DB
$stmt = $pdo->query("SELECT cheie, valoare FROM setari WHERE cheie LIKE 'contact_%'");
$setari = [];
foreach ($stmt->fetchAll() as $s) {
    $setari[$s['cheie']] = $s['valoare'];
}

$adresa       = $setari['contact_adresa']       ?? 'Strada Exemplu, Nr. 00, București';
$telefon      = $setari['contact_telefon']       ?? '0700 000 000';
$email        = $setari['contact_email']         ?? 'contact@apg-garage.ro';
$program_sapt = $setari['contact_program_sapt']  ?? 'Luni — Vineri';
$program_ore  = $setari['contact_program_ore']   ?? '09:00 — 17:00';
$maps_url     = $setari['contact_maps_url']      ?? '';

$success = false;
$error   = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $nume   = trim($_POST['nume'] ?? '');
    $email_form = trim($_POST['email'] ?? '');
    $telefon_form = trim($_POST['telefon'] ?? '');
    $mesaj  = trim($_POST['mesaj'] ?? '');

    if (!$nume || !$email_form || !$mesaj) {
        $error = 'Completează toate câmpurile obligatorii.';
    } elseif (!filter_var($email_form, FILTER_VALIDATE_EMAIL)) {
        $error = 'Adresa de email nu este validă.';
    } else {
        require_once __DIR__ . '/src/helpers/Mailer.php';
        $to      = $email;
        $subject = 'Mesaj nou de pe site — ' . $nume;
        $body    = "Nume: $nume\nEmail: $email_form\nTelefon: $telefon_form\n\nMesaj:\n$mesaj";
        $headers = "From: noreply@apg-garage.ro\r\nReply-To: $email_form";
        mail($to, $subject, $body, $headers);
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
    <title>Contact — APG Garage</title>
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

        .contact-grid {
            display: grid;
            grid-template-columns: 1fr 1.4fr;
            gap: 2.5rem;
            align-items: start;
        }
        @media (max-width: 750px) { .contact-grid { grid-template-columns: 1fr; } }

        .contact-info-item {
            display: flex;
            align-items: flex-start;
            gap: 1rem;
            padding: 1.2rem 0;
            border-bottom: 1px solid var(--border);
        }
        .contact-info-item:last-child { border-bottom: none; }
        .contact-info-item .icon { font-size: 1.2rem; width: 36px; flex-shrink: 0; margin-top: 0.1rem; }
        .contact-info-item .lbl { font-size: 0.72rem; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase; color: var(--red); margin-bottom: 0.3rem; }
        .contact-info-item .val { color: var(--white); font-size: 0.95rem; line-height: 1.5; }
        .contact-info-item .val a { color: var(--white); text-decoration: none; transition: color 0.2s; }
        .contact-info-item .val a:hover { color: var(--red); }

        .program-grid { display: grid; grid-template-columns: 1fr 1fr; }
        .program-row { display: contents; }
        .program-row div { padding: 0.5rem 0; border-bottom: 1px solid var(--border); font-size: 0.88rem; }
        .program-row div:first-child { color: var(--grey-light); }
        .program-row div:last-child { color: var(--grey); text-align: right; }

        .map-wrap { margin-top: 1.5rem; }
        .map-wrap iframe { display:block; width:100%; border:0; }
        .map-placeholder {
            background: var(--dark2); border: 1px solid var(--border);
            height: 220px; display: flex; align-items: center; justify-content: center;
            flex-direction: column; gap: 0.8rem; color: var(--grey); margin-top: 1.5rem;
        }

        .success-box { text-align: center; padding: 3rem 1.5rem; }
        .success-box .ico { font-size: 2.5rem; margin-bottom: 0.8rem; }
        .success-box h2 { font-family: 'Barlow Condensed', sans-serif; font-size: 1.6rem; font-weight: 800; text-transform: uppercase; margin-bottom: 0.5rem; }
    </style>
</head>
<body>

<?php require_once __DIR__ . '/src/views/nav.php'; ?>

<section class="hero-small">
    <div class="section-label">Suntem aici</div>
    <div class="page-title">Contact</div>
    <div class="page-subtitle">Scrie-ne, sună-ne sau vino direct la servis.</div>
</section>

<div class="container" style="padding-top:2.5rem;">
    <div class="contact-grid">

        <!-- Stanga: info + harta -->
        <div>
            <div class="section-label">Date de contact</div>
            <div class="section-title">Găsește-<span>ne</span></div>
            <div class="card" style="padding:0 1.2rem;">
                <div class="contact-info-item">
                    <div class="icon">📍</div>
                    <div>
                        <div class="lbl">Adresă</div>
                        <div class="val"><?= nl2br(htmlspecialchars($adresa)) ?></div>
                    </div>
                </div>
                <div class="contact-info-item">
                    <div class="icon">📞</div>
                    <div>
                        <div class="lbl">Telefon</div>
                        <div class="val">
                            <a href="tel:<?= preg_replace('/\s+/', '', $telefon) ?>">
                                <?= htmlspecialchars($telefon) ?>
                            </a>
                        </div>
                    </div>
                </div>
                <div class="contact-info-item">
                    <div class="icon">✉️</div>
                    <div>
                        <div class="lbl">Email</div>
                        <div class="val">
                            <a href="mailto:<?= htmlspecialchars($email) ?>">
                                <?= htmlspecialchars($email) ?>
                            </a>
                        </div>
                    </div>
                </div>
                <div class="contact-info-item">
                    <div class="icon">🕐</div>
                    <div>
                        <div class="lbl">Program</div>
                        <div class="val">
                            <div class="program-grid">
                                <div class="program-row">
                                    <div><?= htmlspecialchars($program_sapt) ?></div>
                                    <div><?= htmlspecialchars($program_ore) ?></div>
                                </div>
                                <div class="program-row" style="opacity:0.4;">
                                    <div>Sâmbătă — Duminică</div>
                                    <div>Închis</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Harta -->
            <div class="map-wrap">
                <?php if ($maps_url): ?>
                    <iframe src="<?= htmlspecialchars($maps_url) ?>" height="220" allowfullscreen="" loading="lazy"></iframe>
                <?php else: ?>
                    <div class="map-placeholder">
                        <span style="font-size:2rem;">🗺️</span>
                        <span style="font-size:0.85rem;">Harta va fi afișată după configurare din admin</span>
                    </div>
                <?php endif; ?>
            </div>
        </div>

        <!-- Dreapta: formular -->
        <div>
            <div class="section-label">Trimite un mesaj</div>
            <div class="section-title">Scrie-<span>ne</span></div>

            <?php if ($success): ?>
                <div class="card success-box">
                    <div class="ico">✓</div>
                    <h2>Mesaj <span style="color:var(--red)">trimis!</span></h2>
                    <p style="color:var(--grey);">Îți vom răspunde în cel mai scurt timp posibil.</p>
                </div>
            <?php else: ?>
                <?php if ($error): ?>
                    <div class="alert alert-error"><?= htmlspecialchars($error) ?></div>
                <?php endif; ?>
                <div class="card">
                    <form method="POST">
                        <div class="form-group">
                            <label>Nume complet *</label>
                            <input type="text" name="nume" value="<?= htmlspecialchars($_POST['nume'] ?? '') ?>" required>
                        </div>
                        <div class="form-group">
                            <label>Email *</label>
                            <input type="email" name="email" value="<?= htmlspecialchars($_POST['email'] ?? '') ?>" required>
                        </div>
                        <div class="form-group">
                            <label>Telefon</label>
                            <input type="tel" name="telefon" value="<?= htmlspecialchars($_POST['telefon'] ?? '') ?>">
                        </div>
                        <div class="form-group">
                            <label>Mesaj *</label>
                            <textarea name="mesaj" rows="5" placeholder="Scrie întrebarea sau mesajul tău..." required><?= htmlspecialchars($_POST['mesaj'] ?? '') ?></textarea>
                        </div>
                        <button type="submit" class="btn btn-primary" style="width:100%;">Trimite mesajul</button>
                    </form>
                </div>
            <?php endif; ?>
        </div>

    </div>
</div>

<footer>© <?= date('Y') ?> APG Garage. Toate drepturile rezervate.</footer>
</body>
</html>
