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
$error   = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $actiune = $_POST['actiune'] ?? '';

    if ($actiune === 'adauga') {
        $categorie     = trim($_POST['categorie'] ?? '');
        $categorie_noua= trim($_POST['categorie_noua'] ?? '');
        $cat_finala    = $categorie_noua ?: $categorie;
        $nume          = trim($_POST['nume'] ?? '');
        $pret          = floatval($_POST['pret_de_la'] ?? 0);
        $include_piese = isset($_POST['include_piese']) ? 1 : 0;
        $nota          = trim($_POST['nota'] ?? '');

        if (!$cat_finala || !$nume) {
            $error = 'Categoria și numele sunt obligatorii.';
        } else {
            $max = $pdo->query('SELECT MAX(ordine) FROM preturi')->fetchColumn() ?? 0;
            $pdo->prepare('INSERT INTO preturi (categorie, nume, pret_de_la, include_piese, nota, ordine) VALUES (?, ?, ?, ?, ?, ?)')
                ->execute([$cat_finala, $nume, $pret, $include_piese, $nota, $max + 1]);
            $success = 'Prețul a fost adăugat.';
        }
    }

    if ($actiune === 'editeaza') {
        $id            = intval($_POST['pret_id']);
        $categorie     = trim($_POST['categorie'] ?? '');
        $nume          = trim($_POST['nume'] ?? '');
        $pret          = floatval($_POST['pret_de_la'] ?? 0);
        $include_piese = isset($_POST['include_piese']) ? 1 : 0;
        $nota          = trim($_POST['nota'] ?? '');

        if (!$categorie || !$nume) {
            $error = 'Categoria și numele sunt obligatorii.';
        } else {
            $pdo->prepare('UPDATE preturi SET categorie=?, nume=?, pret_de_la=?, include_piese=?, nota=? WHERE id=?')
                ->execute([$categorie, $nume, $pret, $include_piese, $nota, $id]);
            $success = 'Prețul a fost actualizat.';
        }
    }

    if ($actiune === 'toggle') {
        $id = intval($_POST['pret_id']);
        $pdo->prepare('UPDATE preturi SET activ = 1 - activ WHERE id=?')->execute([$id]);
        header('Location: /admin/preturi.php'); exit;
    }

    if ($actiune === 'sterge') {
        $id = intval($_POST['pret_id']);
        $pdo->prepare('DELETE FROM preturi WHERE id=?')->execute([$id]);
        $success = 'Prețul a fost șters.';
    }

    if ($actiune === 'reordoneaza') {
        $ordine = $_POST['ordine'] ?? [];
        foreach ($ordine as $id => $ord) {
            $pdo->prepare('UPDATE preturi SET ordine=? WHERE id=?')->execute([intval($ord), intval($id)]);
        }
        header('Content-Type: application/json');
        echo json_encode(['ok' => true]);
        exit;
    }
}

// Incarca preturile grupate pe categorii
$preturi = $pdo->query('SELECT * FROM preturi ORDER BY ordine ASC, id ASC')->fetchAll();
$categorii_existente = array_unique(array_column($preturi, 'categorie'));

// Grupeaza
$grouped = [];
foreach ($preturi as $p) {
    $grouped[$p['categorie']][] = $p;
}
?>
<!DOCTYPE html>
<html lang="ro">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Prețuri — Admin APG Garage</title>
    <link rel="stylesheet" href="/css/style.css">
    <style>
        .adauga-form { background:var(--dark2); border:1px solid var(--border); border-top:4px solid var(--red); padding:1.8rem; margin-bottom:2rem; }
        .adauga-form h3 { font-family:'Barlow Condensed',sans-serif; font-size:1.2rem; font-weight:700; text-transform:uppercase; letter-spacing:1px; margin-bottom:1.2rem; }
        .fg3 { display:grid; grid-template-columns:2fr 1fr 1fr; gap:0 1rem; }
        .fg2 { display:grid; grid-template-columns:1fr 1fr; gap:0 1rem; }
        @media(max-width:650px){ .fg3,.fg2 { grid-template-columns:1fr; } }

        .cat-section { margin-bottom:2rem; }
        .cat-title {
            font-family:'Barlow Condensed',sans-serif;
            font-size:1.1rem; font-weight:700; text-transform:uppercase; letter-spacing:1px;
            padding:0.6rem 1rem; background:var(--black); border-left:4px solid var(--red);
            display:flex; justify-content:space-between; align-items:center;
            margin-bottom:0;
        }
        .cat-count { font-size:0.72rem; color:var(--grey); letter-spacing:1px; }

        .pret-row {
            background:var(--dark2); border:1px solid var(--border); border-top:none;
            padding:0.9rem 1rem;
            display:grid; grid-template-columns:32px 1fr auto auto auto;
            gap:0.8rem; align-items:center;
            cursor:default;
        }
        .pret-row.inactiv { opacity:0.5; }
        .pret-row:hover { background:rgba(255,255,255,0.02); }

        .drag-handle { color:#444; cursor:grab; font-size:1.1rem; user-select:none; text-align:center; }
        .drag-handle:active { cursor:grabbing; }
        .dragging { opacity:0.3; }

        .pret-info .pret-nume { font-size:0.92rem; color:var(--white); }
        .pret-info .pret-meta { font-size:0.78rem; color:var(--grey); margin-top:0.1rem; }

        .pret-val {
            font-family:'Barlow Condensed',sans-serif;
            font-size:1rem; font-weight:700; color:var(--red);
            white-space:nowrap; text-align:right;
        }

        .pret-actions { display:flex; gap:0.4rem; flex-shrink:0; }
        .pret-actions button {
            padding:0.25rem 0.6rem;
            font-family:'Barlow Condensed',sans-serif;
            font-size:0.75rem; font-weight:700; letter-spacing:1px; text-transform:uppercase;
            cursor:pointer; border:1px solid; background:none; transition:all 0.15s;
        }
        .btn-e { border-color:var(--border); color:var(--grey); }
        .btn-e:hover { border-color:var(--white); color:var(--white); }
        .btn-t-on  { border-color:#1e8449; color:#2ecc71; }
        .btn-t-on:hover  { background:#1e8449; color:#fff; }
        .btn-t-off { border-color:#444; color:#666; }
        .btn-t-off:hover { background:#444; color:#fff; }
        .btn-d { border-color:#333; color:#555; }
        .btn-d:hover { border-color:var(--red); color:var(--red); }

        @media(max-width:600px){
            .pret-row { grid-template-columns:1fr auto; }
            .drag-handle { display:none; }
            .pret-val { display:none; }
        }

        /* Modal */
        .modal { display:none; position:fixed; inset:0; background:rgba(0,0,0,0.85); z-index:999; align-items:center; justify-content:center; padding:1rem; }
        .modal.open { display:flex; }
        .modal-box { background:var(--dark2); border:1px solid var(--border); padding:1.8rem; width:100%; max-width:520px; }
        .modal-box h3 { font-family:'Barlow Condensed',sans-serif; font-size:1.3rem; font-weight:800; text-transform:uppercase; margin-bottom:1.2rem; }

        .preview-btn { display:inline-block; margin-top:1rem; padding:0.5rem 1.2rem; background:none; border:1px solid var(--border); color:var(--grey); font-family:'Barlow Condensed',sans-serif; font-size:0.85rem; font-weight:700; letter-spacing:1px; text-transform:uppercase; text-decoration:none; transition:all 0.15s; }
        .preview-btn:hover { border-color:var(--red); color:var(--red); }
    </style>
</head>
<body>
<?php require_once __DIR__ . '/../src/views/nav_admin.php'; ?>

<div class="container">
    <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:1rem;margin-bottom:0.3rem;">
        <div class="page-title">Gestionare <span>prețuri</span></div>
        <a href="/preturi.php" target="_blank" class="preview-btn">Previzualizează →</a>
    </div>
    <div class="page-subtitle">Adaugă, editează și reordonează prețurile afișate pe site.</div>

    <?php if ($success): ?><div class="alert alert-success"><?= htmlspecialchars($success) ?></div><?php endif; ?>
    <?php if ($error):   ?><div class="alert alert-error"><?= htmlspecialchars($error) ?></div><?php endif; ?>

    <!-- Formular adaugare -->
    <div class="adauga-form">
        <h3>+ Preț nou</h3>
        <form method="POST">
            <input type="hidden" name="actiune" value="adauga">
            <div class="fg3">
                <div class="form-group">
                    <label>Categorie *</label>
                    <select name="categorie" id="cat-select" onchange="toggleCatNoua(this)">
                        <?php foreach ($categorii_existente as $cat): ?>
                            <option value="<?= htmlspecialchars($cat) ?>"><?= htmlspecialchars($cat) ?></option>
                        <?php endforeach; ?>
                        <option value="__noua__">+ Categorie nouă...</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Preț de la (lei)</label>
                    <input type="number" name="pret_de_la" value="0" min="0" step="0.01">
                </div>
                <div class="form-group" style="display:flex;align-items:flex-end;">
                    <label style="display:flex;align-items:center;gap:0.5rem;cursor:pointer;padding-bottom:0.75rem;">
                        <input type="checkbox" name="include_piese" value="1" checked style="width:auto;accent-color:var(--red);">
                        + piese
                    </label>
                </div>
            </div>
            <div class="form-group" id="cat-noua-wrap" style="display:none;">
                <label>Nume categorie nouă *</label>
                <input type="text" name="categorie_noua" placeholder="ex: Climatizare">
            </div>
            <div class="fg2">
                <div class="form-group">
                    <label>Denumire serviciu *</label>
                    <input type="text" name="nume" placeholder="ex: Schimb plăcuțe față" required>
                </div>
                <div class="form-group">
                    <label>Notă (opțional)</label>
                    <input type="text" name="nota" placeholder="ex: per bucată, manoperă">
                </div>
            </div>
            <button type="submit" class="btn btn-primary">Adaugă prețul</button>
        </form>
    </div>

    <!-- Lista preturi grupate -->
    <?php foreach ($grouped as $categorie => $randuri): ?>
    <div class="cat-section">
        <div class="cat-title">
            <span><?= htmlspecialchars($categorie) ?></span>
            <span class="cat-count"><?= count($randuri) ?> servicii</span>
        </div>
        <?php foreach ($randuri as $p): ?>
        <div class="pret-row <?= $p['activ'] ? '' : 'inactiv' ?>" data-id="<?= $p['id'] ?>" draggable="true">
            <div class="drag-handle" title="Trage pentru reordonare">⠿</div>
            <div class="pret-info">
                <div class="pret-nume"><?= htmlspecialchars($p['nume']) ?></div>
                <div class="pret-meta">
                    <?= $p['activ'] ? '✓ Vizibil' : '✕ Ascuns' ?>
                    <?= $p['nota'] ? ' · ' . htmlspecialchars($p['nota']) : '' ?>
                </div>
            </div>
            <div class="pret-val">
                de la <?= number_format($p['pret_de_la'], 0) ?> lei<?= $p['include_piese'] ? ' + piese' : '' ?>
            </div>
            <div class="pret-actions">
                <button class="btn-e" onclick="openEdit(
                    <?= $p['id'] ?>,
                    '<?= htmlspecialchars(addslashes($p['categorie'])) ?>',
                    '<?= htmlspecialchars(addslashes($p['nume'])) ?>',
                    <?= $p['pret_de_la'] ?>,
                    <?= $p['include_piese'] ?>,
                    '<?= htmlspecialchars(addslashes($p['nota'] ?? '')) ?>'
                )">Edit</button>
                <form method="POST" style="display:inline;">
                    <input type="hidden" name="actiune" value="toggle">
                    <input type="hidden" name="pret_id" value="<?= $p['id'] ?>">
                    <button type="submit" class="<?= $p['activ'] ? 'btn-t-on' : 'btn-t-off' ?>">
                        <?= $p['activ'] ? 'Ascunde' : 'Afișează' ?>
                    </button>
                </form>
                <form method="POST" style="display:inline;" onsubmit="return confirm('Ștergi acest preț?')">
                    <input type="hidden" name="actiune" value="sterge">
                    <input type="hidden" name="pret_id" value="<?= $p['id'] ?>">
                    <button type="submit" class="btn-d">✕</button>
                </form>
            </div>
        </div>
        <?php endforeach; ?>
    </div>
    <?php endforeach; ?>

    <div class="alert alert-info" style="font-size:0.85rem;">
        Trage rândurile cu ⠿ pentru a schimba ordinea. Salvarea e automată.
    </div>
</div>

<!-- Modal editare -->
<div class="modal" id="modal-edit">
    <div class="modal-box">
        <h3>Editează <span style="color:var(--red)">prețul</span></h3>
        <form method="POST">
            <input type="hidden" name="actiune" value="editeaza">
            <input type="hidden" name="pret_id" id="edit-id">
            <div class="fg2">
                <div class="form-group">
                    <label>Categorie *</label>
                    <input type="text" name="categorie" id="edit-cat" required>
                </div>
                <div class="form-group">
                    <label>Preț de la (lei)</label>
                    <input type="number" name="pret_de_la" id="edit-pret" min="0" step="0.01">
                </div>
            </div>
            <div class="form-group">
                <label>Denumire serviciu *</label>
                <input type="text" name="nume" id="edit-nume" required>
            </div>
            <div class="form-group">
                <label>Notă</label>
                <input type="text" name="nota" id="edit-nota" placeholder="ex: per bucată, manoperă">
            </div>
            <div class="form-group">
                <label style="display:flex;align-items:center;gap:0.5rem;cursor:pointer;">
                    <input type="checkbox" name="include_piese" id="edit-piese" value="1" style="width:auto;accent-color:var(--red);">
                    Prețul nu include piesele (afișează + piese)
                </label>
            </div>
            <div style="display:flex;gap:1rem;margin-top:0.5rem;">
                <button type="submit" class="btn btn-primary">Salvează</button>
                <button type="button" class="btn btn-outline" onclick="closeEdit()">Anulează</button>
            </div>
        </form>
    </div>
</div>

<footer>© <?= date('Y') ?> APG Garage. Toate drepturile rezervate.</footer>

<script>
function toggleCatNoua(sel) {
    document.getElementById('cat-noua-wrap').style.display = sel.value === '__noua__' ? 'block' : 'none';
}

function openEdit(id, cat, nume, pret, piese, nota) {
    document.getElementById('edit-id').value   = id;
    document.getElementById('edit-cat').value  = cat;
    document.getElementById('edit-nume').value = nume;
    document.getElementById('edit-pret').value = pret;
    document.getElementById('edit-nota').value = nota;
    document.getElementById('edit-piese').checked = piese == 1;
    document.getElementById('modal-edit').classList.add('open');
}
function closeEdit() { document.getElementById('modal-edit').classList.remove('open'); }
document.getElementById('modal-edit').addEventListener('click', function(e) { if(e.target===this) closeEdit(); });

// Drag & drop reordonare
let dragged = null;
document.querySelectorAll('.pret-row').forEach(row => {
    row.addEventListener('dragstart', function() {
        dragged = this;
        setTimeout(() => this.classList.add('dragging'), 0);
    });
    row.addEventListener('dragend', function() {
        this.classList.remove('dragging');
        document.querySelectorAll('.pret-row').forEach(r => r.classList.remove('drag-over'));
        salveazaOrdine();
    });
    row.addEventListener('dragover', function(e) {
        e.preventDefault();
        document.querySelectorAll('.pret-row').forEach(r => r.classList.remove('drag-over'));
        if (this !== dragged) this.style.borderTop = '2px solid var(--red)';
    });
    row.addEventListener('dragleave', function() { this.style.borderTop = ''; });
    row.addEventListener('drop', function(e) {
        e.preventDefault();
        this.style.borderTop = '';
        if (this !== dragged) {
            const rows = [...document.querySelectorAll('.pret-row')];
            const di   = rows.indexOf(dragged);
            const ti   = rows.indexOf(this);
            if (di < ti) this.after(dragged);
            else this.before(dragged);
        }
    });
});

function salveazaOrdine() {
    const ordine = {};
    document.querySelectorAll('.pret-row').forEach((r, i) => { ordine[r.dataset.id] = i + 1; });
    const fd = new FormData();
    fd.append('actiune', 'reordoneaza');
    for (const [id, ord] of Object.entries(ordine)) fd.append('ordine[' + id + ']', ord);
    fetch('/admin/preturi.php', { method:'POST', body:fd });
}
</script>
</body>
</html>
