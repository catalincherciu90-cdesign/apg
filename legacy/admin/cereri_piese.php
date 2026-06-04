<?php
require_once __DIR__ . '/../src/config/config.php';
require_once __DIR__ . '/../src/config/db.php';
require_once __DIR__ . '/../src/helpers/Auth.php';
require_once __DIR__ . '/../src/helpers/Permisiuni.php';
require_once __DIR__ . '/../src/helpers/Mailer.php';

Auth::requireLogin();
Auth::requireAngajat();
Permisiuni::requireAccess('dezmembrari');

$success = '';
$error   = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST' && ($_POST['actiune'] ?? '') === 'raspunde') {
    $id      = intval($_POST['cerere_id'] ?? 0);
    $status  = $_POST['status_cerere'] ?? 'asteptare';
    $raspuns = trim($_POST['raspuns_admin'] ?? '');

    if (!$raspuns) {
        $error = 'Scrie un mesaj pentru client înainte să trimiți răspunsul.';
    } else {
        $pdo->prepare('UPDATE cereri_piese SET status=?, raspuns_admin=? WHERE id=?')
            ->execute([$status, $raspuns, $id]);

        $stmt = $pdo->prepare('SELECT cp.*, d.producator, d.model, d.an_fabricatie, u.email, u.nume as client_nume
            FROM cereri_piese cp
            LEFT JOIN dezmembrari d ON d.id = cp.dezmembrare_id
            LEFT JOIN users u ON u.id = cp.user_id
            WHERE cp.id = ?');
        $stmt->execute([$id]);
        $cerere = $stmt->fetch();

        if ($cerere && $cerere['email']) {
            $status_text    = $status === 'disponibil' ? 'DISPONIBILĂ' : 'INDISPONIBILĂ';
            $culoare_status = $status === 'disponibil' ? '#2ecc71' : '#c0392b';
            $continut = '
                <p>Ai primit un răspuns la cererea ta de piesă.</p>
                <table class="info-table">
                    <tr><td>Mașina</td><td>' . htmlspecialchars(($cerere['producator'] ?? '') . ' ' . ($cerere['model'] ?? '') . ' ' . ($cerere['an_fabricatie'] ?? '')) . '</td></tr>
                    <tr><td>Piesa cerută</td><td>' . htmlspecialchars($cerere['piesa_dorita']) . '</td></tr>
                    <tr><td>Disponibilitate</td><td><strong style="color:' . $culoare_status . ';">' . $status_text . '</strong></td></tr>
                </table>
                <p style="margin-top:1rem;"><strong>Mesaj de la servis:</strong><br>' . nl2br(htmlspecialchars($raspuns)) . '</p>
                <a href="https://apg-garage.ro/dezmembrari.php" class="btn">Vezi alte piese disponibile</a>
            ';
            trimiteEmail($cerere['email'], 'Răspuns cerere piesă — APG Garage', emailTemplate('Răspuns la cererea ta de piesă', $continut));
        }

        $success = 'Răspunsul a fost trimis clientului.';
    }
}

$filter = $_GET['status'] ?? 'toate';
$where  = $filter !== 'toate' ? "WHERE cp.status = '$filter'" : '';

$cereri = $pdo->query("
    SELECT cp.*, d.producator, d.model, d.an_fabricatie, u.email, u.nume as client_nume
    FROM cereri_piese cp
    LEFT JOIN dezmembrari d ON d.id = cp.dezmembrare_id
    LEFT JOIN users u ON u.id = cp.user_id
    $where
    ORDER BY cp.created_at DESC
")->fetchAll();

$stats = $pdo->query("SELECT status, COUNT(*) as cnt FROM cereri_piese GROUP BY status")->fetchAll(PDO::FETCH_KEY_PAIR);
?>
<!DOCTYPE html>
<html lang="ro">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Cereri piese — Admin APG Garage</title>
    <link rel="stylesheet" href="/css/style.css">
    <style>
        .stats-row { display:grid; grid-template-columns:repeat(3,1fr); gap:1rem; margin-bottom:2rem; }
        .stat-card { background:var(--dark2); border:1px solid var(--border); padding:1rem; text-align:center; }
        .stat-card .num { font-family:'Barlow Condensed',sans-serif; font-size:2rem; font-weight:800; line-height:1; }
        .stat-card .lbl { font-size:0.7rem; color:var(--grey); letter-spacing:1px; text-transform:uppercase; margin-top:0.3rem; }

        .filters { display:flex; gap:0.5rem; flex-wrap:wrap; margin-bottom:1.5rem; }
        .filters a { padding:0.4rem 0.9rem; border:1px solid var(--border); color:var(--grey); text-decoration:none; font-size:0.8rem; font-weight:600; letter-spacing:1px; text-transform:uppercase; transition:all 0.15s; }
        .filters a:hover, .filters a.active { border-color:var(--red); color:var(--red); }

        .cerere-card { background:var(--dark2); border:1px solid var(--border); border-left:4px solid; padding:1.2rem 1.5rem; margin-bottom:1rem; }
        .cerere-card.asteptare   { border-left-color:#f0a500; }
        .cerere-card.disponibil  { border-left-color:#2ecc71; }
        .cerere-card.indisponibil{ border-left-color:var(--red); }

        .cerere-header { display:flex; justify-content:space-between; align-items:flex-start; gap:1rem; margin-bottom:0.8rem; flex-wrap:wrap; }
        .cerere-client { font-family:'Barlow Condensed',sans-serif; font-size:1.1rem; font-weight:700; letter-spacing:1px; }
        .cerere-data { color:var(--grey); font-size:0.82rem; }

        .cerere-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(200px,1fr)); gap:0.5rem 1rem; margin-bottom:0.8rem; font-size:0.88rem; }
        .cerere-row .lbl { font-size:0.68rem; font-weight:700; letter-spacing:1.5px; text-transform:uppercase; color:var(--grey); }
        .cerere-row .val { color:var(--white); }

        .piesa-box { background:var(--black); border:1px solid var(--border); border-left:3px solid var(--red); padding:0.7rem 1rem; margin-bottom:0.8rem; font-size:0.88rem; color:var(--grey-light); }
        .piesa-box strong { color:var(--white); display:block; font-size:0.68rem; letter-spacing:1.5px; text-transform:uppercase; color:var(--grey); margin-bottom:0.2rem; }

        .raspuns-box { background:#0b2c13; border:1px solid #1e8449; padding:0.7rem 1rem; margin-bottom:0.8rem; font-size:0.85rem; color:#a9dfbf; }
        .raspuns-box.neg { background:#2c0b0b; border-color:var(--red); color:#f5b7b1; }
        .raspuns-box strong { display:block; font-size:0.68rem; letter-spacing:1.5px; text-transform:uppercase; margin-bottom:0.2rem; }

        .modal { display:none; position:fixed; inset:0; background:rgba(0,0,0,0.85); z-index:999; align-items:center; justify-content:center; padding:1rem; }
        .modal.open { display:flex; }
        .modal-box { background:var(--dark2); border:1px solid var(--border); padding:1.8rem; width:100%; max-width:500px; }
        .modal-box h3 { font-family:'Barlow Condensed',sans-serif; font-size:1.3rem; font-weight:800; text-transform:uppercase; margin-bottom:1rem; }
    </style>
</head>
<body>
<?php require_once __DIR__ . '/../src/views/nav_admin.php'; ?>

<div class="container">
    <div class="page-title">Cereri <span>piese</span></div>
    <div class="page-subtitle">Răspunde la cererile clienților pentru piese din dezmembrări.</div>

    <?php if ($success): ?><div class="alert alert-success"><?= htmlspecialchars($success) ?></div><?php endif; ?>
    <?php if ($error):   ?><div class="alert alert-error"><?= htmlspecialchars($error) ?></div><?php endif; ?>

    <div class="stats-row">
        <div class="stat-card"><div class="num" style="color:#f0a500"><?= $stats['asteptare'] ?? 0 ?></div><div class="lbl">În așteptare</div></div>
        <div class="stat-card"><div class="num" style="color:#2ecc71"><?= $stats['disponibil'] ?? 0 ?></div><div class="lbl">Disponibile</div></div>
        <div class="stat-card"><div class="num" style="color:var(--red)"><?= $stats['indisponibil'] ?? 0 ?></div><div class="lbl">Indisponibile</div></div>
    </div>

    <div class="filters">
        <?php foreach (['toate' => 'Toate', 'asteptare' => 'În așteptare', 'disponibil' => 'Disponibile', 'indisponibil' => 'Indisponibile'] as $k => $v): ?>
            <a href="?status=<?= $k ?>" class="<?= $filter === $k ? 'active' : '' ?>"><?= $v ?></a>
        <?php endforeach; ?>
    </div>

    <?php if (empty($cereri)): ?>
        <div class="card" style="text-align:center;color:var(--grey);padding:2rem;">Nicio cerere găsită.</div>
    <?php else: ?>
        <?php foreach ($cereri as $c): ?>
        <div class="cerere-card <?= $c['status'] ?>">
            <div class="cerere-header">
                <div>
                    <div class="cerere-client"><?= htmlspecialchars($c['nume']) ?></div>
                    <div class="cerere-data"><?= date('d.m.Y H:i', strtotime($c['created_at'])) ?></div>
                </div>
                <span class="badge <?= $c['status'] === 'asteptare' ? 'badge-asteptare' : ($c['status'] === 'disponibil' ? 'badge-confirmat' : 'badge-respins') ?>">
                    <?= $c['status'] === 'asteptare' ? 'În așteptare' : ($c['status'] === 'disponibil' ? 'Disponibil' : 'Indisponibil') ?>
                </span>
            </div>

            <div class="cerere-grid">
                <div class="cerere-row">
                    <div class="lbl">Telefon</div>
                    <div class="val"><a href="tel:<?= htmlspecialchars($c['telefon']) ?>" style="color:var(--white);text-decoration:none;"><?= htmlspecialchars($c['telefon']) ?></a></div>
                </div>
                <div class="cerere-row">
                    <div class="lbl">Email</div>
                    <div class="val" style="font-size:0.82rem;"><?= htmlspecialchars($c['email'] ?? '—') ?></div>
                </div>
                <div class="cerere-row">
                    <div class="lbl">Mașina dezmembrată</div>
                    <div class="val"><?= htmlspecialchars(($c['producator'] ?? '—') . ' ' . ($c['model'] ?? '') . ' ' . ($c['an_fabricatie'] ?? '')) ?></div>
                </div>
            </div>

            <div class="piesa-box">
                <strong>Piesa dorită</strong>
                <?= htmlspecialchars($c['piesa_dorita']) ?>
            </div>

            <?php if ($c['raspuns_admin']): ?>
            <div class="raspuns-box <?= $c['status'] === 'indisponibil' ? 'neg' : '' ?>">
                <strong>Răspunsul tău</strong>
                <?= nl2br(htmlspecialchars($c['raspuns_admin'])) ?>
            </div>
            <?php endif; ?>

            <button class="btn btn-outline" style="padding:0.4rem 1rem;font-size:0.82rem;"
                onclick="openRaspuns(<?= $c['id'] ?>, '<?= htmlspecialchars(addslashes($c['raspuns_admin'] ?? '')) ?>', '<?= $c['status'] ?>')">
                <?= $c['status'] === 'asteptare' ? 'Răspunde' : 'Modifică răspunsul' ?>
            </button>
        </div>
        <?php endforeach; ?>
    <?php endif; ?>
</div>

<!-- Modal raspuns -->
<div class="modal" id="modal-raspuns">
    <div class="modal-box">
        <h3>Răspunde la <span style="color:var(--red)">cerere</span></h3>
        <form method="POST">
            <input type="hidden" name="actiune" value="raspunde">
            <input type="hidden" name="cerere_id" id="raspuns-id">
            <div class="form-group">
                <label>Disponibilitate *</label>
                <select name="status_cerere" id="raspuns-status">
                    <option value="disponibil">✓ Piesa este disponibilă</option>
                    <option value="indisponibil">✕ Piesa nu este disponibilă</option>
                </select>
            </div>
            <div class="form-group">
                <label>Mesaj pentru client *</label>
                <textarea name="raspuns_admin" id="raspuns-text" rows="5"
                    placeholder="ex: Piesa este disponibilă, prețul este 200 lei. Sună-ne la 0700 000 000 pentru a stabili ridicarea."></textarea>
            </div>
            <div style="display:flex;gap:1rem;margin-top:0.5rem;">
                <button type="submit" class="btn btn-primary">Trimite răspunsul</button>
                <button type="button" class="btn btn-outline" onclick="closeModal()">Anulează</button>
            </div>
        </form>
    </div>
</div>

<footer>© <?= date('Y') ?> APG Garage. Toate drepturile rezervate.</footer>

<script>
function openRaspuns(id, raspuns, status) {
    document.getElementById('raspuns-id').value     = id;
    document.getElementById('raspuns-text').value   = raspuns;
    document.getElementById('raspuns-status').value = status !== 'asteptare' ? status : 'disponibil';
    document.getElementById('modal-raspuns').classList.add('open');
}
function closeModal() { document.getElementById('modal-raspuns').classList.remove('open'); }
document.getElementById('modal-raspuns').addEventListener('click', function(e) { if (e.target === this) closeModal(); });
</script>
</body>
</html>
