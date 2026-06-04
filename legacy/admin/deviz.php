<?php
require_once __DIR__ . '/../src/config/config.php';
require_once __DIR__ . '/../src/config/db.php';
require_once __DIR__ . '/../src/helpers/Auth.php';
require_once __DIR__ . '/../src/helpers/Mailer.php';
require_once __DIR__ . '/../catalog_piese.php';

Auth::requireLogin();
Auth::requireAngajat();

$rezervare_id = intval($_GET['rezervare_id'] ?? 0);
if (!$rezervare_id) { header('Location: /admin/index.php'); exit; }

$stmt = $pdo->prepare('SELECT r.*, u.nume as client_nume, u.email as client_email, u.telefon as client_telefon
    FROM rezervari r JOIN users u ON u.id = r.user_id WHERE r.id = ?');
$stmt->execute([$rezervare_id]);
$rezervare = $stmt->fetch();
if (!$rezervare) { header('Location: /admin/index.php'); exit; }

$stmt = $pdo->prepare('SELECT * FROM devize WHERE rezervare_id = ?');
$stmt->execute([$rezervare_id]);
$deviz = $stmt->fetch();

if (!$deviz) {
    $pdo->prepare('INSERT INTO devize (rezervare_id) VALUES (?)')->execute([$rezervare_id]);
    $deviz = $pdo->prepare('SELECT * FROM devize WHERE rezervare_id = ?');
    $deviz->execute([$rezervare_id]);
    $deviz = $deviz->fetch();
}

$deviz_id = $deviz['id'];

if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['actiune'])) {
    if ($_POST['actiune'] === 'salveaza') {
        $pdo->prepare('DELETE FROM deviz_randuri WHERE deviz_id = ?')->execute([$deviz_id]);

        $randuri = $_POST['randuri'] ?? [];
        foreach ($randuri as $rand) {
            $tip       = $rand['tip'] ?? 'piesa';
            $categorie = trim($rand['categorie'] ?? '');
            $nume      = trim($rand['nume'] ?? '');
            $cantitate = floatval($rand['cantitate'] ?? 1);
            $pret      = floatval($rand['pret_unitar'] ?? 0);
            $total     = $cantitate * $pret;
            if (!$nume) continue;
            $pdo->prepare('INSERT INTO deviz_randuri (deviz_id, tip, categorie, nume, cantitate, pret_unitar, total) VALUES (?, ?, ?, ?, ?, ?, ?)')
                ->execute([$deviz_id, $tip, $categorie, $nume, $cantitate, $pret, $total]);
        }

        $obs = trim($_POST['observatii'] ?? '');
        $pdo->prepare('UPDATE devize SET observatii = ?, status = "draft" WHERE id = ?')->execute([$obs, $deviz_id]);
    }

    if ($_POST['actiune'] === 'trimite') {
        $pdo->prepare('UPDATE devize SET status = "trimis" WHERE id = ?')->execute([$deviz_id]);
        $stmt_total = $pdo->prepare('SELECT SUM(total) as total FROM deviz_randuri WHERE deviz_id = ?');
        $stmt_total->execute([$deviz_id]);
        $total_deviz = $stmt_total->fetchColumn() ?? 0;
        notificareDevizNou($rezervare['client_nume'], $rezervare['client_email'], $rezervare['nr_inmatriculare'] ?? '-', $rezervare_id, $total_deviz);
    }

    header('Location: /admin/deviz.php?rezervare_id=' . $rezervare_id . '&saved=1');
    exit;
}

$stmt = $pdo->prepare('SELECT * FROM deviz_randuri WHERE deviz_id = ? ORDER BY tip, categorie, id');
$stmt->execute([$deviz_id]);
$randuri_existente = $stmt->fetchAll();

$total_general = array_sum(array_column($randuri_existente, 'total'));
$saved = isset($_GET['saved']);

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
        .info-bar { background:var(--black); border:1px solid var(--border); border-left:4px solid var(--red); padding:1rem 1.5rem; margin-bottom:2rem; display:flex; flex-wrap:wrap; gap:1.5rem; }
        .info-bar .info-item { display:flex; flex-direction:column; gap:0.1rem; }
        .info-bar .info-item .lbl { font-size:0.7rem; font-weight:700; letter-spacing:1.5px; text-transform:uppercase; color:var(--grey); }
        .info-bar .info-item .val { font-size:0.95rem; color:var(--white); }
        .deviz-section { margin-bottom:2rem; }
        .deviz-section-title { font-family:'Barlow Condensed',sans-serif; font-size:1.1rem; font-weight:700; text-transform:uppercase; letter-spacing:1px; padding:0.6rem 1rem; background:var(--black); border-left:4px solid var(--red); margin-bottom:0; }
        .rand-row { display:grid; grid-template-columns:2fr 1fr 1fr 1fr auto; gap:0.5rem; align-items:center; padding:0.6rem 1rem; border-bottom:1px solid var(--border); background:var(--dark2); }
        .rand-row:hover { background:rgba(255,255,255,0.02); }
        .rand-row input, .rand-row select { background:var(--black); border:1px solid var(--border); color:var(--white); padding:0.4rem 0.6rem; font-family:'Barlow',sans-serif; font-size:0.88rem; width:100%; outline:none; }
        .rand-row input:focus, .rand-row select:focus { border-color:var(--red); }
        .rand-row .total-cell { font-family:'Barlow Condensed',sans-serif; font-size:1rem; font-weight:700; color:var(--red); text-align:right; white-space:nowrap; }
        .rand-row .del-btn { background:none; border:1px solid #333; color:#555; width:28px; height:28px; cursor:pointer; font-size:1rem; display:flex; align-items:center; justify-content:center; transition:all 0.15s; flex-shrink:0; }
        .rand-row .del-btn:hover { border-color:var(--red); color:var(--red); }
        .rand-header { display:grid; grid-template-columns:2fr 1fr 1fr 1fr auto; gap:0.5rem; padding:0.5rem 1rem; background:var(--black); border-bottom:1px solid var(--border); }
        .rand-header span { font-size:0.7rem; font-weight:700; letter-spacing:1.5px; text-transform:uppercase; color:var(--grey); }
        .add-btn { display:block; width:100%; padding:0.7rem; background:none; border:1px dashed var(--border); color:var(--grey); font-family:'Barlow Condensed',sans-serif; font-size:0.9rem; font-weight:600; letter-spacing:1px; text-transform:uppercase; cursor:pointer; transition:all 0.15s; }
        .add-btn:hover { border-color:var(--red); color:var(--red); }
        .total-bar { background:var(--black); border:1px solid var(--border); border-top:2px solid var(--red); padding:1.2rem 1.5rem; display:flex; justify-content:flex-end; align-items:center; gap:1rem; margin-bottom:2rem; }
        .total-bar .total-label { color:var(--grey); font-size:0.9rem; text-transform:uppercase; letter-spacing:1px; }
        .total-bar .total-val { font-family:'Barlow Condensed',sans-serif; font-size:2rem; font-weight:800; color:var(--red); }
        .action-bar { display:flex; gap:1rem; flex-wrap:wrap; margin-bottom:2rem; }
        .status-badge-deviz { display:inline-block; padding:0.3rem 0.8rem; font-size:0.75rem; font-weight:700; letter-spacing:1px; text-transform:uppercase; }
        .status-draft  { background:#2a2a00; color:#f0a500; }
        .status-trimis { background:#0b2c13; color:#2ecc71; }
        @media (max-width:650px) {
            .rand-header { display:none; }
            .rand-row { grid-template-columns:1fr 1fr; grid-template-rows:auto auto auto; gap:0.4rem; padding:0.8rem; }
            .rand-row .nume-col { grid-column:1/-1; }
            .rand-row .total-cell { text-align:left; }
            .info-bar { flex-direction:column; gap:0.8rem; }
        }
    </style>
</head>
<body>

<?php require_once __DIR__ . '/../src/views/nav_admin.php'; ?>

<div class="container">
    <div style="display:flex;align-items:center;gap:1rem;margin-bottom:0.3rem;flex-wrap:wrap;">
        <div class="page-title">Deviz <span>#<?= $deviz_id ?></span></div>
        <span class="status-badge-deviz status-<?= $deviz['status'] ?>"><?= $deviz['status'] === 'trimis' ? 'Trimis la client' : 'Draft' ?></span>
    </div>
    <div class="page-subtitle">
        <a href="/admin/index.php" style="color:var(--red);text-decoration:none;">← Înapoi la programări</a>
    </div>

    <?php if ($saved): ?>
        <div class="alert alert-success">Devizul a fost salvat.</div>
    <?php endif; ?>

    <div class="info-bar">
        <div class="info-item"><span class="lbl">Client</span><span class="val"><?= htmlspecialchars($rezervare['client_nume']) ?></span></div>
        <div class="info-item"><span class="lbl">Telefon</span><span class="val"><?= htmlspecialchars($rezervare['client_telefon']) ?></span></div>
        <div class="info-item"><span class="lbl">Mașina</span><span class="val"><?= htmlspecialchars($rezervare['nr_inmatriculare'] ?? '-') ?> — <?= htmlspecialchars(($rezervare['producator'] ?? '') . ' ' . ($rezervare['model'] ?? '')) ?></span></div>
        <div class="info-item"><span class="lbl">Data</span><span class="val"><?= date('d.m.Y', strtotime($rezervare['data'])) ?> ora <?= substr($rezervare['ora_start'], 0, 5) ?></span></div>
        <div class="info-item"><span class="lbl">Serviciu</span><span class="val"><?= serviciu_label($rezervare['serviciu_tip']) ?></span></div>
    </div>

    <form method="POST" id="deviz-form">

        <div class="deviz-section">
            <div class="deviz-section-title">🔧 Piese</div>
            <div class="rand-header">
                <span>Piesă</span><span>Categorie</span><span>Cantitate</span><span>Preț unitar (lei)</span><span></span>
            </div>
            <div id="lista-piese">
                <?php foreach ($randuri_existente as $i => $rand): ?>
                    <?php if ($rand['tip'] !== 'piesa') continue; ?>
                    <div class="rand-row">
                        <div class="nume-col">
                            <input type="text" name="randuri[<?= $i ?>][nume]" value="<?= htmlspecialchars($rand['nume']) ?>" placeholder="Denumire piesă" required>
                        </div>
                        <input type="hidden" name="randuri[<?= $i ?>][tip]" value="piesa">
                        <input type="text" name="randuri[<?= $i ?>][categorie]" value="<?= htmlspecialchars($rand['categorie']) ?>" placeholder="Categorie">
                        <input type="number" name="randuri[<?= $i ?>][cantitate]" value="<?= $rand['cantitate'] ?>" min="0.1" step="0.1" class="qty-input">
                        <input type="number" name="randuri[<?= $i ?>][pret_unitar]" value="<?= $rand['pret_unitar'] ?>" min="0" step="0.01" placeholder="0.00" class="pret-input">
                        <span class="total-cell"><?= number_format($rand['total'], 2) ?> lei</span>
                        <button type="button" class="del-btn" onclick="this.closest('.rand-row').remove(); recalcTotal()">×</button>
                    </div>
                <?php endforeach; ?>
            </div>
            <button type="button" class="add-btn" onclick="adaugaPiesa()">+ Adaugă piesă</button>
        </div>

        <div class="deviz-section">
            <div class="deviz-section-title">⚙️ Manoperă</div>
            <div class="rand-header">
                <span>Serviciu</span><span></span><span>Ore / buc</span><span>Preț (lei)</span><span></span>
            </div>
            <div id="lista-manopera">
                <?php foreach ($randuri_existente as $i => $rand): ?>
                    <?php if ($rand['tip'] !== 'manopera') continue; ?>
                    <div class="rand-row">
                        <div class="nume-col" style="grid-column:1/3;">
                            <input type="text" name="randuri[<?= $i ?>][nume]" value="<?= htmlspecialchars($rand['nume']) ?>" placeholder="Denumire manoperă" required>
                        </div>
                        <input type="hidden" name="randuri[<?= $i ?>][tip]" value="manopera">
                        <input type="hidden" name="randuri[<?= $i ?>][categorie]" value="manopera">
                        <input type="number" name="randuri[<?= $i ?>][cantitate]" value="<?= $rand['cantitate'] ?>" min="0.1" step="0.1" class="qty-input">
                        <input type="number" name="randuri[<?= $i ?>][pret_unitar]" value="<?= $rand['pret_unitar'] ?>" min="0" step="0.01" placeholder="0.00" class="pret-input">
                        <span class="total-cell"><?= number_format($rand['total'], 2) ?> lei</span>
                        <button type="button" class="del-btn" onclick="this.closest('.rand-row').remove(); recalcTotal()">×</button>
                    </div>
                <?php endforeach; ?>
            </div>
            <button type="button" class="add-btn" onclick="adaugaManopera()">+ Adaugă manoperă</button>
        </div>

        <div class="form-group">
            <label>Observații</label>
            <textarea name="observatii" rows="3" placeholder="Observații suplimentare pentru client..."><?= htmlspecialchars($deviz['observatii'] ?? '') ?></textarea>
        </div>

        <div class="total-bar">
            <span class="total-label">Total deviz</span>
            <span class="total-val" id="total-display"><?= number_format($total_general, 2) ?> lei</span>
        </div>

        <div class="action-bar">
            <button type="submit" name="actiune" value="salveaza" class="btn btn-outline">Salvează draft</button>
            <?php if ($deviz['status'] === 'draft'): ?>
                <button type="submit" name="actiune" value="trimite" class="btn btn-primary" onclick="return confirm('Trimiți devizul la client?')">Trimite la client</button>
            <?php else: ?>
                <button type="submit" name="actiune" value="salveaza" class="btn btn-primary">Actualizează deviz</button>
            <?php endif; ?>
            <a href="/admin/index.php" class="btn btn-outline">Anulează</a>
        </div>

    </form>
</div>

<template id="tpl-piesa">
    <div class="rand-row">
        <div class="nume-col">
            <select class="piesa-select" style="width:100%;background:var(--black);border:1px solid var(--border);color:var(--white);padding:0.4rem 0.6rem;font-family:'Barlow',sans-serif;font-size:0.88rem;outline:none;">
                <option value="">Alege din catalog sau scrie manual...</option>
                <?php foreach ($catalog_piese as $cat => $piese): ?>
                    <optgroup label="<?= htmlspecialchars($cat) ?>">
                        <?php foreach ($piese as $piesa): ?>
                            <option value="<?= htmlspecialchars($piesa) ?>" data-cat="<?= htmlspecialchars($cat) ?>"><?= htmlspecialchars($piesa) ?></option>
                        <?php endforeach; ?>
                    </optgroup>
                <?php endforeach; ?>
                <option value="__custom__">✏️ Scrie manual...</option>
            </select>
            <input type="text" class="piesa-input" placeholder="Denumire piesă" style="display:none;width:100%;background:var(--black);border:1px solid var(--border);color:var(--white);padding:0.4rem 0.6rem;font-family:'Barlow',sans-serif;font-size:0.88rem;outline:none;">
        </div>
        <input type="hidden" class="tip-hidden" value="piesa">
        <input type="hidden" class="cat-hidden">
        <input type="number" class="qty-input" placeholder="1" value="1" min="0.1" step="0.1">
        <input type="number" class="pret-input" placeholder="0.00" min="0" step="0.01">
        <span class="total-cell">0.00 lei</span>
        <button type="button" class="del-btn" onclick="this.closest('.rand-row').remove(); recalcTotal()">×</button>
    </div>
</template>

<template id="tpl-manopera">
    <div class="rand-row">
        <div class="nume-col" style="grid-column:1/3;">
            <select class="manopera-select" style="width:100%;background:var(--black);border:1px solid var(--border);color:var(--white);padding:0.4rem 0.6rem;font-family:'Barlow',sans-serif;font-size:0.88rem;outline:none;">
                <option value="">Alege sau scrie manual...</option>
                <?php foreach ($catalog_manopera as $m): ?>
                    <option value="<?= htmlspecialchars($m) ?>"><?= htmlspecialchars($m) ?></option>
                <?php endforeach; ?>
                <option value="__custom__">✏️ Scrie manual...</option>
            </select>
            <input type="text" class="manopera-input" placeholder="Denumire manoperă" style="display:none;width:100%;background:var(--black);border:1px solid var(--border);color:var(--white);padding:0.4rem 0.6rem;font-family:'Barlow',sans-serif;font-size:0.88rem;outline:none;">
        </div>
        <input type="hidden" class="tip-hidden" value="manopera">
        <input type="hidden" class="cat-hidden" value="manopera">
        <input type="number" class="qty-input" placeholder="1" value="1" min="0.1" step="0.1">
        <input type="number" class="pret-input" placeholder="0.00" min="0" step="0.01">
        <span class="total-cell">0.00 lei</span>
        <button type="button" class="del-btn" onclick="this.closest('.rand-row').remove(); recalcTotal()">×</button>
    </div>
</template>

<footer>© <?= date('Y') ?> APG Garage. Toate drepturile rezervate.</footer>

<script>
let randCounter = <?= count($randuri_existente) + 10 ?>;

function adaugaPiesa() {
    const tpl = document.getElementById('tpl-piesa').content.cloneNode(true);
    const row = tpl.querySelector('.rand-row');
    const idx = randCounter++;
    const sel = row.querySelector('.piesa-select');
    const inp = row.querySelector('.piesa-input');
    const tip = row.querySelector('.tip-hidden');
    const cat = row.querySelector('.cat-hidden');
    const qty = row.querySelector('.qty-input');
    const pret= row.querySelector('.pret-input');
    tip.name = `randuri[${idx}][tip]`;
    cat.name = `randuri[${idx}][categorie]`;
    qty.name = `randuri[${idx}][cantitate]`;
    pret.name= `randuri[${idx}][pret_unitar]`;
    sel.addEventListener('change', function() {
        if (this.value === '__custom__') {
            inp.style.display='block'; inp.name=`randuri[${idx}][nume]`; inp.required=true;
            sel.style.display='none'; sel.removeAttribute('name'); inp.focus();
        } else if (this.value) {
            const opt = this.options[this.selectedIndex];
            cat.value = opt.dataset.cat || '';
            inp.style.display='none'; sel.name=`randuri[${idx}][nume]`;
        }
    });
    qty.addEventListener('input', () => updateTotal(row));
    pret.addEventListener('input', () => updateTotal(row));
    document.getElementById('lista-piese').appendChild(row);
}

function adaugaManopera() {
    const tpl = document.getElementById('tpl-manopera').content.cloneNode(true);
    const row = tpl.querySelector('.rand-row');
    const idx = randCounter++;
    const sel = row.querySelector('.manopera-select');
    const inp = row.querySelector('.manopera-input');
    const tip = row.querySelector('.tip-hidden');
    const cat = row.querySelector('.cat-hidden');
    const qty = row.querySelector('.qty-input');
    const pret= row.querySelector('.pret-input');
    tip.name = `randuri[${idx}][tip]`;
    cat.name = `randuri[${idx}][categorie]`;
    qty.name = `randuri[${idx}][cantitate]`;
    pret.name= `randuri[${idx}][pret_unitar]`;
    sel.addEventListener('change', function() {
        if (this.value === '__custom__') {
            inp.style.display='block'; inp.name=`randuri[${idx}][nume]`; inp.required=true;
            sel.style.display='none'; sel.removeAttribute('name'); inp.focus();
        } else if (this.value) {
            sel.name=`randuri[${idx}][nume]`;
        }
    });
    qty.addEventListener('input', () => updateTotal(row));
    pret.addEventListener('input', () => updateTotal(row));
    document.getElementById('lista-manopera').appendChild(row);
}

function updateTotal(row) {
    const qty  = parseFloat(row.querySelector('.qty-input').value) || 0;
    const pret = parseFloat(row.querySelector('.pret-input').value) || 0;
    row.querySelector('.total-cell').textContent = (qty * pret).toFixed(2) + ' lei';
    recalcTotal();
}

function recalcTotal() {
    let total = 0;
    document.querySelectorAll('.total-cell').forEach(el => { total += parseFloat(el.textContent) || 0; });
    document.getElementById('total-display').textContent = total.toFixed(2) + ' lei';
}

document.querySelectorAll('.rand-row').forEach(row => {
    const qty  = row.querySelector('.qty-input');
    const pret = row.querySelector('.pret-input');
    if (qty)  qty.addEventListener('input', () => updateTotal(row));
    if (pret) pret.addEventListener('input', () => updateTotal(row));
});
</script>
</body>
</html>
