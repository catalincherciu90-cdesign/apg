<?php
require_once __DIR__ . '/src/config/config.php';
require_once __DIR__ . '/src/config/db.php';
require_once __DIR__ . '/src/helpers/Auth.php';

Auth::requireLogin();
if (Auth::isAngajat()) { header('Location: /admin/index.php'); exit; }

$rezervare_id = intval($_GET['rezervare_id'] ?? 0);
if (!$rezervare_id) { header('Location: /dashboard.php'); exit; }

// Verifica ca rezervarea apartine clientului
$stmt = $pdo->prepare('SELECT r.*, u.nume as client_nume FROM rezervari r JOIN users u ON u.id = r.user_id WHERE r.id = ? AND r.user_id = ?');
$stmt->execute([$rezervare_id, $_SESSION['user_id']]);
$rezervare = $stmt->fetch();
if (!$rezervare) { header('Location: /dashboard.php'); exit; }

// Incarca devizul
$stmt = $pdo->prepare('SELECT * FROM devize WHERE rezervare_id = ? AND status = "trimis"');
$stmt->execute([$rezervare_id]);
$deviz = $stmt->fetch();
if (!$deviz) { header('Location: /dashboard.php'); exit; }

// Incarca randurile
$stmt = $pdo->prepare('SELECT * FROM deviz_randuri WHERE deviz_id = ? ORDER BY tip, categorie, id');
$stmt->execute([$deviz['id']]);
$randuri = $stmt->fetchAll();

$piese    = array_filter($randuri, fn($r) => $r['tip'] === 'piesa');
$manopera = array_filter($randuri, fn($r) => $r['tip'] === 'manopera');
$total    = array_sum(array_column($randuri, 'total'));

function serviciu_label($tip) {
    $map = ['revizie' => 'Revizie', 'reparatie' => 'Reparație mecanică', 'verificare_rampa' => 'Verificare rampă'];
    return $map[$tip] ?? ucfirst($tip);
}
?>
<!DOCTYPE html>
<html lang="ro">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="theme-color" content="#c0392b">
    <meta name="apple-mobile-web-app-capable" content="yes">
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
    <meta name="apple-mobile-web-app-title" content="APG Garage">
    <link rel="manifest" href="/manifest.json">
    <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png">
    <script>if("serviceWorker"in navigator){window.addEventListener("load",function(){navigator.serviceWorker.register("/sw.js");});}</script>
    <title>Deviz — APG Garage</title>
    <link rel="stylesheet" href="/css/style.css">
    <style>
        .deviz-wrap {
            max-width: 800px;
        }
        .deviz-header {
            background: var(--black);
            border: 1px solid var(--border);
            border-top: 4px solid var(--red);
            padding: 1.5rem;
            margin-bottom: 1.5rem;
        }
        .deviz-header h2 {
            font-family: 'Barlow Condensed', sans-serif;
            font-size: 1.6rem;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 2px;
            margin-bottom: 1rem;
        }
        .deviz-header h2 span { color: var(--red); }
        .deviz-meta {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 1rem;
        }
        @media (max-width: 500px) { .deviz-meta { grid-template-columns: 1fr 1fr; } }
        .deviz-meta-item .lbl { font-size: 0.7rem; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase; color: var(--grey); margin-bottom: 0.2rem; }
        .deviz-meta-item .val { font-size: 0.92rem; color: var(--white); }

        .deviz-section { margin-bottom: 1.5rem; }
        .deviz-section-title {
            font-family: 'Barlow Condensed', sans-serif;
            font-size: 1.05rem;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 1px;
            padding: 0.6rem 1rem;
            background: var(--black);
            border-left: 4px solid var(--red);
        }

        .deviz-table { width: 100%; border-collapse: collapse; background: var(--dark2); }
        .deviz-table th {
            background: var(--black);
            color: var(--grey);
            font-size: 0.72rem;
            font-weight: 600;
            letter-spacing: 1.5px;
            text-transform: uppercase;
            padding: 0.6rem 1rem;
            text-align: left;
            border-bottom: 1px solid var(--border);
        }
        .deviz-table td {
            padding: 0.75rem 1rem;
            border-bottom: 1px solid var(--border);
            font-size: 0.9rem;
        }
        .deviz-table td:last-child { text-align: right; font-family: 'Barlow Condensed', sans-serif; font-size: 1rem; font-weight: 700; color: var(--red); }
        .deviz-table th:last-child { text-align: right; }
        .deviz-table .cat-badge {
            display: inline-block;
            font-size: 0.7rem;
            color: var(--grey);
            background: var(--black);
            padding: 0.1rem 0.5rem;
            margin-left: 0.5rem;
            vertical-align: middle;
        }

        .total-final {
            background: var(--black);
            border: 1px solid var(--border);
            border-top: 2px solid var(--red);
            padding: 1.2rem 1.5rem;
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 1.5rem;
        }
        .total-final .label { color: var(--grey); font-size: 0.9rem; text-transform: uppercase; letter-spacing: 1px; }
        .total-final .valoare {
            font-family: 'Barlow Condensed', sans-serif;
            font-size: 2rem;
            font-weight: 800;
            color: var(--red);
        }

        .obs-box {
            background: var(--dark2);
            border: 1px solid var(--border);
            border-left: 4px solid var(--grey);
            padding: 1rem 1.2rem;
            margin-bottom: 1.5rem;
            color: var(--grey-light);
            font-size: 0.9rem;
            line-height: 1.6;
        }
        .obs-box .obs-label { font-size: 0.7rem; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase; color: var(--grey); margin-bottom: 0.4rem; }

        /* Mobile: tabel devine lista */
        @media (max-width: 550px) {
            .deviz-table thead { display: none; }
            .deviz-table tr {
                display: flex;
                flex-direction: column;
                padding: 0.8rem 1rem;
                border-bottom: 1px solid var(--border);
            }
            .deviz-table td {
                padding: 0.1rem 0;
                border: none;
                font-size: 0.88rem;
            }
            .deviz-table td:last-child { text-align: left; margin-top: 0.3rem; }
        }
    </style>
</head>
<body>

<?php require_once __DIR__ . '/src/views/nav.php'; ?>

<div class="container">
    <div class="deviz-wrap">
        <div class="page-title">Devizul <span>tău</span></div>
        <div class="page-subtitle">
            <a href="/dashboard.php" style="color:var(--red);text-decoration:none;">← Înapoi la programări</a>
        </div>

        <!-- Header deviz -->
        <div class="deviz-header">
            <h2>APG <span>Garage</span></h2>
            <div class="deviz-meta">
                <div class="deviz-meta-item">
                    <div class="lbl">Client</div>
                    <div class="val"><?= htmlspecialchars($rezervare['client_nume']) ?></div>
                </div>
                <div class="deviz-meta-item">
                    <div class="lbl">Mașina</div>
                    <div class="val"><?= htmlspecialchars($rezervare['nr_inmatriculare'] ?? '-') ?><br><small style="color:var(--grey)"><?= htmlspecialchars(($rezervare['producator'] ?? '') . ' ' . ($rezervare['model'] ?? '')) ?></small></div>
                </div>
                <div class="deviz-meta-item">
                    <div class="lbl">Data</div>
                    <div class="val"><?= date('d.m.Y', strtotime($rezervare['data'])) ?></div>
                </div>
                <div class="deviz-meta-item">
                    <div class="lbl">Serviciu</div>
                    <div class="val"><?= serviciu_label($rezervare['serviciu_tip']) ?></div>
                </div>
                <div class="deviz-meta-item">
                    <div class="lbl">Nr. deviz</div>
                    <div class="val">#<?= $deviz['id'] ?></div>
                </div>
                <div class="deviz-meta-item">
                    <div class="lbl">Data deviz</div>
                    <div class="val"><?= date('d.m.Y', strtotime($deviz['updated_at'])) ?></div>
                </div>
            </div>
        </div>

        <!-- Piese -->
        <?php if (!empty($piese)): ?>
        <div class="deviz-section">
            <div class="deviz-section-title">🔧 Piese</div>
            <table class="deviz-table">
                <thead>
                    <tr>
                        <th>Denumire</th>
                        <th>Cantitate</th>
                        <th>Preț unitar</th>
                        <th>Total</th>
                    </tr>
                </thead>
                <tbody>
                <?php foreach ($piese as $r): ?>
                    <tr>
                        <td>
                            <?= htmlspecialchars($r['nume']) ?>
                            <?php if ($r['categorie']): ?>
                                <span class="cat-badge"><?= htmlspecialchars($r['categorie']) ?></span>
                            <?php endif; ?>
                        </td>
                        <td><?= number_format($r['cantitate'], 0) ?> buc</td>
                        <td><?= number_format($r['pret_unitar'], 2) ?> lei</td>
                        <td><?= number_format($r['total'], 2) ?> lei</td>
                    </tr>
                <?php endforeach; ?>
                </tbody>
            </table>
        </div>
        <?php endif; ?>

        <!-- Manopera -->
        <?php if (!empty($manopera)): ?>
        <div class="deviz-section">
            <div class="deviz-section-title">⚙️ Manoperă</div>
            <table class="deviz-table">
                <thead>
                    <tr>
                        <th>Serviciu</th>
                        <th>Cantitate</th>
                        <th>Preț unitar</th>
                        <th>Total</th>
                    </tr>
                </thead>
                <tbody>
                <?php foreach ($manopera as $r): ?>
                    <tr>
                        <td><?= htmlspecialchars($r['nume']) ?></td>
                        <td><?= number_format($r['cantitate'], 1) ?></td>
                        <td><?= number_format($r['pret_unitar'], 2) ?> lei</td>
                        <td><?= number_format($r['total'], 2) ?> lei</td>
                    </tr>
                <?php endforeach; ?>
                </tbody>
            </table>
        </div>
        <?php endif; ?>

        <!-- Observatii -->
        <?php if ($deviz['observatii']): ?>
        <div class="obs-box">
            <div class="obs-label">Observații</div>
            <?= nl2br(htmlspecialchars($deviz['observatii'])) ?>
        </div>
        <?php endif; ?>

        <!-- Total -->
        <div class="total-final">
            <span class="label">Total de plată</span>
            <span class="valoare"><?= number_format($total, 2) ?> lei</span>
        </div>

        <a href="/dashboard.php" class="btn btn-outline">← Înapoi</a>
    </div>
</div>

<footer>© <?= date('Y') ?> APG Garage. Toate drepturile rezervate.</footer>
</body>
</html>
