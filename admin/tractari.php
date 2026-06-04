<?php
require_once __DIR__ . '/../src/config/config.php';
require_once __DIR__ . '/../src/config/db.php';
require_once __DIR__ . '/../src/helpers/Auth.php';
require_once __DIR__ . '/../src/helpers/Permisiuni.php';

Auth::requireLogin();
Auth::requireAngajat();
Permisiuni::requireAccess('tractari');

$success = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $actiune = $_POST['actiune'] ?? '';
    $id      = intval($_POST['tractare_id'] ?? 0);

    $map = ['confirma' => 'confirmat', 'in_drum' => 'in_drum', 'finalizeaza' => 'finalizat', 'anuleaza' => 'anulat'];
    if (isset($map[$actiune])) {
        $pdo->prepare('UPDATE tractari SET status=? WHERE id=?')->execute([$map[$actiune], $id]);
        $success = 'Status actualizat.';
    }
}

$filter = $_GET['status'] ?? 'toate';
$where  = $filter !== 'toate' ? "WHERE status = '$filter'" : '';
$tractari = $pdo->query("SELECT * FROM tractari $where ORDER BY created_at DESC")->fetchAll();

$stats = $pdo->query("SELECT status, COUNT(*) as cnt FROM tractari GROUP BY status")->fetchAll(PDO::FETCH_KEY_PAIR);

$status_label = ['asteptare' => 'În așteptare', 'confirmat' => 'Confirmat', 'in_drum' => 'În drum', 'finalizat' => 'Finalizat', 'anulat' => 'Anulat'];
$status_badge = ['asteptare' => 'badge-asteptare', 'confirmat' => 'badge-confirmat', 'in_drum' => 'badge-in_lucru', 'finalizat' => 'badge-finalizat', 'anulat' => 'badge-respins'];
?>
<!DOCTYPE html>
<html lang="ro">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Tractări — Admin APG Garage</title>
    <link rel="stylesheet" href="/css/style.css">
    <style>
        .stats-row { display:grid; grid-template-columns:repeat(5,1fr); gap:1rem; margin-bottom:2rem; }
        @media(max-width:700px){ .stats-row { grid-template-columns:repeat(3,1fr); } }
        .stat-card { background:var(--dark2); border:1px solid var(--border); padding:1rem; text-align:center; }
        .stat-card .num { font-family:'Barlow Condensed',sans-serif; font-size:2rem; font-weight:800; line-height:1; }
        .stat-card .lbl { font-size:0.7rem; color:var(--grey); letter-spacing:1px; text-transform:uppercase; margin-top:0.3rem; }
        .filters { display:flex; gap:0.5rem; flex-wrap:wrap; margin-bottom:1.5rem; }
        .filters a { padding:0.4rem 0.9rem; border:1px solid var(--border); color:var(--grey); text-decoration:none; font-size:0.8rem; font-weight:600; letter-spacing:1px; text-transform:uppercase; transition:all 0.15s; }
        .filters a:hover,.filters a.active { border-color:var(--red); color:var(--red); }

        .tractare-card { background:var(--dark2); border:1px solid var(--border); border-left:4px solid var(--border); padding:1.2rem 1.5rem; margin-bottom:1rem; }
        .tractare-card.asteptare { border-left-color:#f0a500; }
        .tractare-card.confirmat { border-left-color:#2ecc71; }
        .tractare-card.in_drum   { border-left-color:#3498db; }
        .tractare-card.finalizat { border-left-color:var(--grey); }
        .tractare-card.anulat    { border-left-color:var(--red); }

        .tc-header { display:flex; justify-content:space-between; align-items:flex-start; gap:1rem; margin-bottom:0.8rem; flex-wrap:wrap; }
        .tc-client { font-family:'Barlow Condensed',sans-serif; font-size:1.15rem; font-weight:700; letter-spacing:1px; }
        .tc-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(200px,1fr)); gap:0.5rem 1rem; margin-bottom:0.8rem; }
        .tc-row .lbl { font-size:0.68rem; font-weight:700; letter-spacing:1.5px; text-transform:uppercase; color:var(--grey); }
        .tc-row .val { font-size:0.88rem; color:var(--white); }
        .tc-locatie { background:var(--black); border:1px solid var(--border); padding:0.6rem 0.9rem; font-size:0.85rem; color:var(--grey-light); margin-bottom:0.8rem; }
        .tc-locatie strong { color:var(--white); display:block; font-size:0.7rem; letter-spacing:1.5px; text-transform:uppercase; color:var(--grey); margin-bottom:0.2rem; }
        .tc-actions { display:flex; gap:0.5rem; flex-wrap:wrap; }
        .tc-actions button { padding:0.35rem 0.8rem; font-family:'Barlow Condensed',sans-serif; font-size:0.8rem; font-weight:700; letter-spacing:1px; text-transform:uppercase; cursor:pointer; border:1px solid; background:none; transition:all 0.15s; }
        .btn-confirma-t { border-color:#1e8449; color:#2ecc71; }
        .btn-confirma-t:hover { background:#1e8449; color:#fff; }
        .btn-drum { border-color:#1a6a9a; color:#3498db; }
        .btn-drum:hover { background:#1a6a9a; color:#fff; }
        .btn-final-t { border-color:var(--grey); color:var(--grey); }
        .btn-final-t:hover { background:var(--grey); color:#000; }
        .btn-anula { border-color:#333; color:#555; }
        .btn-anula:hover { border-color:var(--red); color:var(--red); }
    </style>
</head>
<body>
<?php require_once __DIR__ . '/../src/views/nav.php'; ?>

<div class="container">
    <div class="page-title">Tractări <span>auto</span></div>
    <div class="page-subtitle">Gestionează cererile de tractare</div>

    <?php if ($success): ?>
        <div class="alert alert-success"><?= htmlspecialchars($success) ?></div>
    <?php endif; ?>

    <div class="stats-row">
        <div class="stat-card"><div class="num" style="color:#f0a500"><?= $stats['asteptare'] ?? 0 ?></div><div class="lbl">Așteptare</div></div>
        <div class="stat-card"><div class="num" style="color:#2ecc71"><?= $stats['confirmat'] ?? 0 ?></div><div class="lbl">Confirmate</div></div>
        <div class="stat-card"><div class="num" style="color:#3498db"><?= $stats['in_drum'] ?? 0 ?></div><div class="lbl">În drum</div></div>
        <div class="stat-card"><div class="num" style="color:var(--grey)"><?= $stats['finalizat'] ?? 0 ?></div><div class="lbl">Finalizate</div></div>
        <div class="stat-card"><div class="num" style="color:var(--red)"><?= $stats['anulat'] ?? 0 ?></div><div class="lbl">Anulate</div></div>
    </div>

    <div class="filters">
        <?php foreach (['toate' => 'Toate', 'asteptare' => 'Așteptare', 'confirmat' => 'Confirmate', 'in_drum' => 'În drum', 'finalizat' => 'Finalizate', 'anulat' => 'Anulate'] as $k => $v): ?>
            <a href="?status=<?= $k ?>" class="<?= $filter === $k ? 'active' : '' ?>"><?= $v ?></a>
        <?php endforeach; ?>
    </div>

    <?php if (empty($tractari)): ?>
        <div class="card" style="text-align:center;color:var(--grey);padding:2rem;">Nicio cerere de tractare găsită.</div>
    <?php else: ?>
        <?php foreach ($tractari as $t): ?>
        <div class="tractare-card <?= $t['status'] ?>">
            <div class="tc-header">
                <div>
                    <div class="tc-client"><?= htmlspecialchars($t['nume']) ?></div>
                    <div style="color:var(--grey);font-size:0.85rem;"><?= date('d.m.Y H:i', strtotime($t['created_at'])) ?></div>
                </div>
                <span class="badge <?= $status_badge[$t['status']] ?>"><?= $status_label[$t['status']] ?></span>
            </div>

            <div class="tc-locatie">
                <strong>Locație</strong>
                <?= htmlspecialchars($t['locatie']) ?>
                <a href="https://maps.google.com/?q=<?= urlencode($t['locatie']) ?>" target="_blank" style="color:var(--red);font-size:0.78rem;margin-left:0.5rem;">→ Maps</a>
            </div>

            <div class="tc-grid">
                <div class="tc-row"><div class="lbl">Telefon</div><div class="val"><a href="tel:<?= htmlspecialchars($t['telefon']) ?>" style="color:var(--white);text-decoration:none;"><?= htmlspecialchars($t['telefon']) ?></a></div></div>
                <?php if ($t['nr_inmatriculare']): ?>
                <div class="tc-row"><div class="lbl">Mașina</div><div class="val"><?= htmlspecialchars($t['nr_inmatriculare'] . ' ' . $t['producator'] . ' ' . $t['model']) ?></div></div>
                <?php endif; ?>
                <?php if ($t['descriere_problema']): ?>
                <div class="tc-row" style="grid-column:1/-1;"><div class="lbl">Problemă</div><div class="val"><?= htmlspecialchars($t['descriere_problema']) ?></div></div>
                <?php endif; ?>
            </div>

            <div class="tc-actions">
                <form method="POST" style="display:contents;">
                    <input type="hidden" name="tractare_id" value="<?= $t['id'] ?>">
                    <?php if ($t['status'] === 'asteptare'): ?>
                        <button type="submit" name="actiune" value="confirma" class="btn-confirma-t">Confirmă</button>
                    <?php endif; ?>
                    <?php if ($t['status'] === 'confirmat'): ?>
                        <button type="submit" name="actiune" value="in_drum" class="btn-drum">În drum</button>
                    <?php endif; ?>
                    <?php if ($t['status'] === 'in_drum'): ?>
                        <button type="submit" name="actiune" value="finalizeaza" class="btn-final-t">Finalizat</button>
                    <?php endif; ?>
                    <?php if (!in_array($t['status'], ['finalizat','anulat'])): ?>
                        <button type="submit" name="actiune" value="anuleaza" class="btn-anula" onclick="return confirm('Anulezi cererea?')">Anulează</button>
                    <?php endif; ?>
                </form>
            </div>
        </div>
        <?php endforeach; ?>
    <?php endif; ?>
</div>

<footer>© <?= date('Y') ?> APG Garage. Toate drepturile rezervate.</footer>
</body>
</html>
