<?php
require_once __DIR__ . '/../src/config/config.php';
require_once __DIR__ . '/../src/config/db.php';
require_once __DIR__ . '/../src/helpers/Auth.php';
require_once __DIR__ . '/../src/helpers/Permisiuni.php';

Auth::requireLogin();
Auth::requireAngajat();
Permisiuni::requireAccess('dezmembrari');

$success = '';
$error   = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $actiune = $_POST['actiune'] ?? '';

    if ($actiune === 'adauga') {
        $prod  = trim($_POST['producator'] ?? '');
        $model = trim($_POST['model'] ?? '');
        $an    = trim($_POST['an_fabricatie'] ?? '');
        $motor = trim($_POST['motorizare'] ?? '');
        $descr = trim($_POST['descriere'] ?? '');
        if (!$prod || !$model) { $error = 'Producătorul și modelul sunt obligatorii.'; }
        else {
            $pdo->prepare('INSERT INTO dezmembrari (producator, model, an_fabricatie, motorizare, descriere) VALUES (?, ?, ?, ?, ?)')->execute([$prod, $model, $an, $motor, $descr]);
            $success = 'Mașina a fost adăugată.';
        }
    }
    if ($actiune === 'editeaza') {
        $id = intval($_POST['masina_id']);
        $prod  = trim($_POST['producator'] ?? '');
        $model = trim($_POST['model'] ?? '');
        $an    = trim($_POST['an_fabricatie'] ?? '');
        $motor = trim($_POST['motorizare'] ?? '');
        $descr = trim($_POST['descriere'] ?? '');
        if (!$prod || !$model) { $error = 'Producătorul și modelul sunt obligatorii.'; }
        else {
            $pdo->prepare('UPDATE dezmembrari SET producator=?, model=?, an_fabricatie=?, motorizare=?, descriere=? WHERE id=?')->execute([$prod, $model, $an, $motor, $descr, $id]);
            $success = 'Mașina a fost actualizată.';
        }
    }
    if ($actiune === 'toggle') {
        $pdo->prepare('UPDATE dezmembrari SET activ = 1 - activ WHERE id=?')->execute([intval($_POST['masina_id'])]);
        header('Location: /admin/dezmembrari.php'); exit;
    }
    if ($actiune === 'sterge') {
        $pdo->prepare('DELETE FROM dezmembrari WHERE id=?')->execute([intval($_POST['masina_id'])]);
        $success = 'Mașina a fost ștearsă.';
    }
}

$masini = $pdo->query('SELECT *, (SELECT COUNT(*) FROM cereri_piese WHERE dezmembrare_id = dezmembrari.id) as nr_cereri FROM dezmembrari ORDER BY activ DESC, producator, model')->fetchAll();
?>
<!DOCTYPE html>
<html lang="ro">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Mașini dezmembrate — Admin APG Garage</title>
    <link rel="stylesheet" href="/css/style.css">
    <style>
        .adauga-form { background:var(--dark2); border:1px solid var(--border); border-top:4px solid var(--red); padding:1.8rem; margin-bottom:2rem; }
        .adauga-form h3 { font-family:'Barlow Condensed',sans-serif; font-size:1.2rem; font-weight:700; text-transform:uppercase; letter-spacing:1px; margin-bottom:1.2rem; }
        .fg4 { display:grid; grid-template-columns:1fr 1fr 1fr 1fr; gap:0 1rem; }
        .fg2 { display:grid; grid-template-columns:1fr 1fr; gap:0 1rem; }
        @media(max-width:800px){ .fg4 { grid-template-columns:1fr 1fr; } }
        @media(max-width:500px){ .fg4,.fg2 { grid-template-columns:1fr; } }

        .masina-card { background:var(--dark2); border:1px solid var(--border); border-left:4px solid; padding:1.2rem 1.5rem; margin-bottom:0.8rem; }
        .masina-card.activa   { border-left-color:#2ecc71; }
        .masina-card.inactiva { border-left-color:#444; opacity:0.65; }
        .mc-header { display:flex; justify-content:space-between; align-items:flex-start; gap:1rem; margin-bottom:0.5rem; flex-wrap:wrap; }
        .mc-titlu { font-family:'Barlow Condensed',sans-serif; font-size:1.2rem; font-weight:700; text-transform:uppercase; letter-spacing:1px; }
        .mc-meta  { color:var(--grey); font-size:0.85rem; margin-bottom:0.6rem; }
        .mc-descr { font-size:0.85rem; color:var(--grey-light); margin-bottom:0.8rem; }
        .mc-actions { display:flex; gap:0.5rem; flex-wrap:wrap; }
        .mc-actions button { padding:0.35rem 0.8rem; font-family:'Barlow Condensed',sans-serif; font-size:0.8rem; font-weight:700; letter-spacing:1px; text-transform:uppercase; cursor:pointer; border:1px solid; background:none; transition:all 0.15s; }
        .btn-edit-m   { border-color:var(--border); color:var(--grey); }
        .btn-edit-m:hover { border-color:var(--white); color:var(--white); }
        .btn-toggle-m { border-color:#1e8449; color:#2ecc71; }
        .btn-toggle-m:hover { background:#1e8449; color:#fff; }
        .btn-toggle-m.off { border-color:#444; color:#666; }
        .btn-toggle-m.off:hover { background:#444; color:#fff; }
        .btn-del-m { border-color:#333; color:#555; }
        .btn-del-m:hover { border-color:var(--red); color:var(--red); }
        .cereri-badge { font-size:0.75rem; background:#0b1e2c; color:#3498db; border:1px solid #1a6a9a; padding:0.2rem 0.6rem; text-decoration:none; }

        .modal { display:none; position:fixed; inset:0; background:rgba(0,0,0,0.85); z-index:999; align-items:center; justify-content:center; padding:1rem; }
        .modal.open { display:flex; }
        .modal-box { background:var(--dark2); border:1px solid var(--border); padding:1.8rem; width:100%; max-width:500px; }
        .modal-box h3 { font-family:'Barlow Condensed',sans-serif; font-size:1.3rem; font-weight:800; text-transform:uppercase; margin-bottom:1.2rem; }
    </style>
</head>
<body>
<?php require_once __DIR__ . '/../src/views/nav_admin.php'; ?>

<div class="container">
    <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:1rem;margin-bottom:0.3rem;">
        <div class="page-title">Mașini <span>dezmembrate</span></div>
        <a href="/admin/cereri_piese.php" class="btn btn-outline" style="padding:0.5rem 1.2rem;font-size:0.88rem;">Cereri piese →</a>
    </div>
    <div class="page-subtitle">Adaugă și gestionează mașinile disponibile pe site pentru dezmembrare.</div>

    <?php if ($success): ?><div class="alert alert-success"><?= htmlspecialchars($success) ?></div><?php endif; ?>
    <?php if ($error):   ?><div class="alert alert-error"><?= htmlspecialchars($error) ?></div><?php endif; ?>

    <div class="adauga-form">
        <h3>+ Mașină nouă la dezmembrat</h3>
        <form method="POST">
            <input type="hidden" name="actiune" value="adauga">
            <div class="fg4">
                <div class="form-group"><label>Producător *</label><input type="text" name="producator" placeholder="ex: Volkswagen" required></div>
                <div class="form-group"><label>Model *</label><input type="text" name="model" placeholder="ex: Golf 5" required></div>
                <div class="form-group"><label>An fabricație</label><input type="text" name="an_fabricatie" placeholder="ex: 2008"></div>
                <div class="form-group"><label>Motorizare</label><input type="text" name="motorizare" placeholder="ex: 1.9 TDI 105cp"></div>
            </div>
            <div class="form-group" style="margin-bottom:1rem;"><label>Descriere / stare</label><input type="text" name="descriere" placeholder="ex: Caroserie intactă, motor funcțional"></div>
            <button type="submit" class="btn btn-primary">Adaugă mașina</button>
        </form>
    </div>

    <?php if (empty($masini)): ?>
        <div class="card" style="text-align:center;color:var(--grey);padding:2rem;">Nicio mașină adăugată încă.</div>
    <?php else: ?>
        <div style="color:var(--grey);font-size:0.82rem;margin-bottom:1rem;"><?= count($masini) ?> mașini înregistrate</div>
        <?php foreach ($masini as $m): ?>
        <div class="masina-card <?= $m['activ'] ? 'activa' : 'inactiva' ?>">
            <div class="mc-header">
                <div>
                    <div class="mc-titlu"><?= htmlspecialchars($m['producator']) ?> <?= htmlspecialchars($m['model']) ?></div>
                    <div class="mc-meta">
                        <?= htmlspecialchars($m['an_fabricatie'] ?: '—') ?>
                        <?= $m['motorizare'] ? ' · ' . htmlspecialchars($m['motorizare']) : '' ?>
                        · <?= $m['activ'] ? '<span style="color:#2ecc71;">Vizibilă</span>' : '<span style="color:#666;">Ascunsă</span>' ?>
                    </div>
                </div>
                <?php if ($m['nr_cereri'] > 0): ?>
                    <a href="/admin/cereri_piese.php" class="cereri-badge"><?= $m['nr_cereri'] ?> cereri</a>
                <?php endif; ?>
            </div>
            <?php if ($m['descriere']): ?>
                <div class="mc-descr"><?= htmlspecialchars($m['descriere']) ?></div>
            <?php endif; ?>
            <div class="mc-actions">
                <button class="btn-edit-m" onclick="openEdit(<?= $m['id'] ?>,'<?= htmlspecialchars(addslashes($m['producator'])) ?>','<?= htmlspecialchars(addslashes($m['model'])) ?>','<?= htmlspecialchars(addslashes($m['an_fabricatie']??'')) ?>','<?= htmlspecialchars(addslashes($m['motorizare']??'')) ?>','<?= htmlspecialchars(addslashes($m['descriere']??'')) ?>')">Editează</button>
                <form method="POST" style="display:inline;">
                    <input type="hidden" name="actiune" value="toggle">
                    <input type="hidden" name="masina_id" value="<?= $m['id'] ?>">
                    <button type="submit" class="btn-toggle-m <?= $m['activ'] ? '' : 'off' ?>"><?= $m['activ'] ? 'Ascunde' : 'Afișează' ?></button>
                </form>
                <form method="POST" style="display:inline;" onsubmit="return confirm('Ștergi această mașină?')">
                    <input type="hidden" name="actiune" value="sterge">
                    <input type="hidden" name="masina_id" value="<?= $m['id'] ?>">
                    <button type="submit" class="btn-del-m">Șterge</button>
                </form>
            </div>
        </div>
        <?php endforeach; ?>
    <?php endif; ?>
</div>

<div class="modal" id="modal-edit">
    <div class="modal-box">
        <h3>Editează <span style="color:var(--red)">mașina</span></h3>
        <form method="POST">
            <input type="hidden" name="actiune" value="editeaza">
            <input type="hidden" name="masina_id" id="edit-id">
            <div class="fg2">
                <div class="form-group"><label>Producător *</label><input type="text" name="producator" id="edit-prod" required></div>
                <div class="form-group"><label>Model *</label><input type="text" name="model" id="edit-model" required></div>
                <div class="form-group"><label>An fabricație</label><input type="text" name="an_fabricatie" id="edit-an"></div>
                <div class="form-group"><label>Motorizare</label><input type="text" name="motorizare" id="edit-motor"></div>
            </div>
            <div class="form-group"><label>Descriere</label><input type="text" name="descriere" id="edit-descr"></div>
            <div style="display:flex;gap:1rem;margin-top:0.5rem;">
                <button type="submit" class="btn btn-primary">Salvează</button>
                <button type="button" class="btn btn-outline" onclick="closeEdit()">Anulează</button>
            </div>
        </form>
    </div>
</div>

<footer>© <?= date('Y') ?> APG Garage. Toate drepturile rezervate.</footer>
<script>
function openEdit(id,prod,model,an,motor,descr){
    document.getElementById('edit-id').value=id;
    document.getElementById('edit-prod').value=prod;
    document.getElementById('edit-model').value=model;
    document.getElementById('edit-an').value=an;
    document.getElementById('edit-motor').value=motor;
    document.getElementById('edit-descr').value=descr;
    document.getElementById('modal-edit').classList.add('open');
}
function closeEdit(){document.getElementById('modal-edit').classList.remove('open');}
document.getElementById('modal-edit').addEventListener('click',function(e){if(e.target===this)closeEdit();});
</script>
</body>
</html>
