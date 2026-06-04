<?php
require_once __DIR__ . '/src/config/config.php';
require_once __DIR__ . '/src/config/db.php';
require_once __DIR__ . '/src/helpers/Auth.php';

Auth::requireLogin();
if (Auth::isAngajat()) { header('Location: /admin/index.php'); exit; }

$stmt = $pdo->prepare('SELECT r.*, d.id as deviz_id, d.status as deviz_status
    FROM rezervari r
    LEFT JOIN devize d ON d.rezervare_id = r.id AND d.status = "trimis"
    WHERE r.user_id = ?
    ORDER BY r.data DESC, r.ora_start DESC');
$stmt->execute([$_SESSION['user_id']]);
$rezervari = $stmt->fetchAll();

$status_label = [
    'asteptare' => 'În așteptare',
    'confirmat' => 'Confirmat',
    'respins'   => 'Respins',
    'in_lucru'  => 'În lucru',
    'finalizat' => 'Finalizat',
];

function serviciu_label($tip) {
    $map = [
        'revizie'          => 'Revizie',
        'reparatie'        => 'Reparație mecanică',
        'verificare_rampa' => 'Verificare rampă',
    ];
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
    <title>Programările mele — APG Garage</title>
    <link rel="stylesheet" href="/css/style.css">
    <style>
        .tabel-desktop { display: block; }
        .carduri-mobile { display: none; }

        .rez-card {
            background: var(--dark2);
            border: 1px solid var(--border);
            border-left: 4px solid var(--border);
            padding: 1.2rem;
            margin-bottom: 1rem;
        }
        .rez-card.status-asteptare { border-left-color: #f0a500; }
        .rez-card.status-confirmat { border-left-color: #2ecc71; }
        .rez-card.status-respins   { border-left-color: var(--red); }
        .rez-card.status-in_lucru  { border-left-color: #3498db; }
        .rez-card.status-finalizat { border-left-color: var(--grey); }

        .rez-card-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 0.8rem;
            gap: 0.5rem;
        }
        .rez-card-masina {
            font-family: 'Barlow Condensed', sans-serif;
            font-size: 1.2rem;
            font-weight: 700;
            letter-spacing: 1px;
            text-transform: uppercase;
        }
        .rez-card-masina small {
            display: block;
            font-family: 'Barlow', sans-serif;
            font-size: 0.82rem;
            font-weight: 400;
            color: var(--grey);
            letter-spacing: 0;
            text-transform: none;
        }
        .rez-card-body {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 0.5rem 1rem;
            margin-bottom: 0.8rem;
        }
        .rez-card-row { display: flex; flex-direction: column; gap: 0.1rem; }
        .rez-card-row .lbl {
            font-size: 0.7rem;
            font-weight: 700;
            letter-spacing: 1.5px;
            text-transform: uppercase;
            color: var(--grey);
        }
        .rez-card-row .val { color: var(--white); font-size: 0.9rem; }
        .rez-card-detalii {
            font-size: 0.85rem;
            color: var(--grey);
            padding-top: 0.7rem;
            border-top: 1px solid var(--border);
        }
        .rez-card-detalii.motiv { color: var(--red); }

        @media (max-width: 650px) {
            .tabel-desktop { display: none; }
            .carduri-mobile { display: block; }
        }
    </style>
</head>
<body>

<?php require_once __DIR__ . '/src/views/nav.php'; ?>

<div class="container">
    <div class="page-title">Programările <span>mele</span></div>
    <div class="page-subtitle">Bun venit, <?= htmlspecialchars($_SESSION['user_nume']) ?></div>

    <?php if (empty($rezervari)): ?>
        <div class="card" style="text-align:center;padding:3rem;">
            <p style="color:var(--grey);margin-bottom:1.5rem;">Nu ai nicio programare încă.</p>
            <a href="/rezervare.php" class="btn btn-primary">Fă o programare</a>
        </div>
    <?php else: ?>

        <!-- TABEL DESKTOP -->
        <div class="tabel-desktop">
            <div class="card" style="padding:0;overflow-x:auto;">
                <table>
                    <thead>
                        <tr>
                            <th>Data</th>
                            <th>Ora</th>
                            <th>Mașina</th>
                            <th>Serviciu</th>
                            <th>Durată</th>
                            <th>Status</th>
                            <th>Deviz</th>
                            <th>Detalii</th>
                        </tr>
                    </thead>
                    <tbody>
                    <?php foreach ($rezervari as $r): ?>
                        <tr>
                            <td><?= date('d.m.Y', strtotime($r['data'])) ?></td>
                            <td><?= substr($r['ora_start'], 0, 5) ?></td>
                            <td>
                                <strong style="font-family:'Barlow Condensed',sans-serif;letter-spacing:1px;"><?= htmlspecialchars($r['nr_inmatriculare'] ?? '-') ?></strong><br>
                                <small style="color:var(--grey)"><?= htmlspecialchars(($r['producator'] ?? '') . ' ' . ($r['model'] ?? '')) ?></small>
                            </td>
                            <td><?= serviciu_label($r['serviciu_tip']) ?></td>
                            <td><?= $r['durata'] ?> ore</td>
                            <td><span class="badge badge-<?= $r['status'] ?>"><?= $status_label[$r['status']] ?></span></td>
                            <td>
                                <?php if ($r['deviz_id']): ?>
                                    <a href="/deviz.php?rezervare_id=<?= $r['id'] ?>" style="color:var(--red);font-size:0.85rem;font-weight:600;text-decoration:none;">Vezi deviz →</a>
                                <?php else: ?>
                                    <span style="color:#333;font-size:0.82rem;">—</span>
                                <?php endif; ?>
                            </td>
                            <td>
                                <?php if ($r['status'] === 'respins' && $r['motiv_respingere']): ?>
                                    <span style="color:var(--red);font-size:0.85rem;"><?= htmlspecialchars($r['motiv_respingere']) ?></span>
                                <?php elseif ($r['descriere']): ?>
                                    <span style="color:var(--grey);font-size:0.85rem;"><?= htmlspecialchars(substr($r['descriere'], 0, 60)) ?>...</span>
                                <?php endif; ?>
                            </td>
                        </tr>
                    <?php endforeach; ?>
                    </tbody>
                </table>
            </div>
        </div>

        <!-- CARDURI MOBILE -->
        <div class="carduri-mobile">
            <?php foreach ($rezervari as $r): ?>
            <div class="rez-card status-<?= $r['status'] ?>">
                <div class="rez-card-header">
                    <div class="rez-card-masina">
                        <?= htmlspecialchars($r['nr_inmatriculare'] ?? '-') ?>
                        <small><?= htmlspecialchars(($r['producator'] ?? '') . ' ' . ($r['model'] ?? '')) ?></small>
                    </div>
                    <span class="badge badge-<?= $r['status'] ?>"><?= $status_label[$r['status']] ?></span>
                </div>
                <div class="rez-card-body">
                    <div class="rez-card-row">
                        <span class="lbl">Data</span>
                        <span class="val"><?= date('d.m.Y', strtotime($r['data'])) ?></span>
                    </div>
                    <div class="rez-card-row">
                        <span class="lbl">Ora</span>
                        <span class="val"><?= substr($r['ora_start'], 0, 5) ?></span>
                    </div>
                    <div class="rez-card-row">
                        <span class="lbl">Serviciu</span>
                        <span class="val"><?= serviciu_label($r['serviciu_tip']) ?></span>
                    </div>
                    <div class="rez-card-row">
                        <span class="lbl">Durată</span>
                        <span class="val"><?= $r['durata'] ?> ore</span>
                    </div>
                </div>
                <?php if ($r['status'] === 'respins' && $r['motiv_respingere']): ?>
                    <div class="rez-card-detalii motiv">Motiv: <?= htmlspecialchars($r['motiv_respingere']) ?></div>
                <?php elseif ($r['descriere']): ?>
                    <div class="rez-card-detalii"><?= htmlspecialchars($r['descriere']) ?></div>
                <?php endif; ?>
                <?php if ($r['deviz_id']): ?>
                    <div style="margin-top:0.8rem;">
                        <a href="/deviz.php?rezervare_id=<?= $r['id'] ?>" class="btn btn-primary" style="width:100%;text-align:center;display:block;padding:0.6rem;">Vezi deviz →</a>
                    </div>
                <?php endif; ?>
            </div>
            <?php endforeach; ?>
        </div>

        <div style="margin-top:1rem;">
            <a href="/rezervare.php" class="btn btn-primary" style="width:100%;text-align:center;display:block;">+ Programare nouă</a>
        </div>

    <?php endif; ?>
</div>

<footer>© <?= date('Y') ?> APG Garage. Toate drepturile rezervate.</footer>
</body>
</html>
