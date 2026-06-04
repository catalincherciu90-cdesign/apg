<?php
require_once __DIR__ . '/../src/config/config.php';
require_once __DIR__ . '/../src/config/db.php';
require_once __DIR__ . '/../src/helpers/Auth.php';
require_once __DIR__ . '/../src/helpers/Permisiuni.php';

Auth::requireLogin();
Auth::requireAngajat();
Permisiuni::requireAccess('servicii');

$error   = '';
$success = '';

// Actiuni
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $actiune = $_POST['actiune'] ?? '';

    if ($actiune === 'adauga') {
        $nume     = trim($_POST['nume'] ?? '');
        $descr    = trim($_POST['descriere'] ?? '');
        $durata   = intval($_POST['durata_ore'] ?? 2);
        if (!$nume) {
            $error = 'Numele serviciului este obligatoriu.';
        } else {
            $max_ord = $pdo->query('SELECT MAX(ordine) FROM servicii')->fetchColumn() ?? 0;
            $pdo->prepare('INSERT INTO servicii (nume, descriere, durata_ore, ordine) VALUES (?, ?, ?, ?)')
                ->execute([$nume, $descr, $durata, $max_ord + 1]);
            $success = 'Serviciul a fost adăugat.';
        }
    }

    if ($actiune === 'editeaza') {
        $id    = intval($_POST['serviciu_id']);
        $nume  = trim($_POST['nume'] ?? '');
        $descr = trim($_POST['descriere'] ?? '');
        $durata= intval($_POST['durata_ore'] ?? 2);
        $activ = isset($_POST['activ']) ? 1 : 0;
        if (!$nume) {
            $error = 'Numele serviciului este obligatoriu.';
        } else {
            $pdo->prepare('UPDATE servicii SET nume=?, descriere=?, durata_ore=?, activ=? WHERE id=?')
                ->execute([$nume, $descr, $durata, $activ, $id]);
            $success = 'Serviciul a fost actualizat.';
        }
    }

    if ($actiune === 'sterge') {
        $id = intval($_POST['serviciu_id']);
        $pdo->prepare('DELETE FROM servicii WHERE id=?')->execute([$id]);
        $success = 'Serviciul a fost șters.';
    }

    if ($actiune === 'toggle') {
        $id = intval($_POST['serviciu_id']);
        $pdo->prepare('UPDATE servicii SET activ = 1 - activ WHERE id=?')->execute([$id]);
        header('Location: /admin/servicii.php');
        exit;
    }

    if ($actiune === 'reordoneaza') {
        $ordine = $_POST['ordine'] ?? [];
        foreach ($ordine as $id => $ord) {
            $pdo->prepare('UPDATE servicii SET ordine=? WHERE id=?')->execute([intval($ord), intval($id)]);
        }
        header('Content-Type: application/json');
        echo json_encode(['ok' => true]);
        exit;
    }
}

$servicii = $pdo->query('SELECT * FROM servicii ORDER BY ordine ASC, id ASC')->fetchAll();
?>
<!DOCTYPE html>
<html lang="ro">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Servicii — Admin APG Garage</title>
    <link rel="stylesheet" href="/css/style.css">
    <style>
        .svc-list { margin-bottom: 2rem; }

        .svc-row {
            background: var(--dark2);
            border: 1px solid var(--border);
            border-left: 4px solid var(--border);
            padding: 1.2rem 1.5rem;
            margin-bottom: 0.8rem;
            display: grid;
            grid-template-columns: 32px 1fr auto;
            gap: 1rem;
            align-items: center;
            transition: border-color 0.15s;
        }
        .svc-row.activ   { border-left-color: #2ecc71; }
        .svc-row.inactiv { border-left-color: #444; opacity: 0.6; }
        .svc-row:hover   { border-color: var(--border); }

        .drag-handle {
            color: #444;
            cursor: grab;
            font-size: 1.2rem;
            text-align: center;
            user-select: none;
        }
        .drag-handle:active { cursor: grabbing; }

        .svc-info h3 {
            font-family: 'Barlow Condensed', sans-serif;
            font-size: 1.1rem;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 1px;
            margin-bottom: 0.2rem;
        }
        .svc-info .meta {
            font-size: 0.8rem;
            color: var(--grey);
            display: flex;
            gap: 1rem;
            flex-wrap: wrap;
        }
        .svc-info .descr {
            font-size: 0.85rem;
            color: var(--grey);
            margin-top: 0.3rem;
        }

        .svc-actions { display: flex; gap: 0.5rem; flex-shrink: 0; }
        .svc-actions button {
            padding: 0.35rem 0.8rem;
            font-family: 'Barlow Condensed', sans-serif;
            font-size: 0.8rem;
            font-weight: 700;
            letter-spacing: 1px;
            text-transform: uppercase;
            cursor: pointer;
            border: 1px solid;
            background: none;
            transition: all 0.15s;
        }
        .btn-edit-svc  { border-color: var(--border); color: var(--grey); }
        .btn-edit-svc:hover { border-color: var(--white); color: var(--white); }
        .btn-toggle { border-color: #1e8449; color: #2ecc71; }
        .btn-toggle:hover { background: #1e8449; color: var(--white); }
        .btn-toggle.off { border-color: #444; color: #666; }
        .btn-toggle.off:hover { background: #444; color: var(--white); }
        .btn-del-svc { border-color: #333; color: #555; }
        .btn-del-svc:hover { border-color: var(--red); color: var(--red); }

        /* Modal */
        .modal { display:none; position:fixed; inset:0; background:rgba(0,0,0,0.85); z-index:999; align-items:center; justify-content:center; padding:1rem; }
        .modal.open { display:flex; }
        .modal-box { background: var(--dark2); border: 1px solid var(--border); padding: 1.8rem; width:100%; max-width:480px; }
        .modal-box h3 { font-family:'Barlow Condensed',sans-serif; font-size:1.4rem; font-weight:800; text-transform:uppercase; margin-bottom:1.2rem; }

        .adauga-form { background: var(--dark2); border: 1px solid var(--border); border-top: 4px solid var(--red); padding: 1.8rem; margin-bottom: 2rem; }
        .adauga-form h3 { font-family:'Barlow Condensed',sans-serif; font-size:1.2rem; font-weight:700; text-transform:uppercase; letter-spacing:1px; margin-bottom:1.2rem; }

        .fg3 { display: grid; grid-template-columns: 1fr 1fr 120px; gap: 0 1rem; }
        @media (max-width: 600px) {
            .fg3 { grid-template-columns: 1fr; }
            .svc-row { grid-template-columns: 1fr auto; }
            .drag-handle { display: none; }
            .svc-actions { flex-wrap: wrap; }
        }

        .dragging { opacity: 0.4; }
        .drag-over { border-top: 2px solid var(--red); }
    </style>
</head>
<body>

<?php require_once __DIR__ . '/../src/views/nav.php'; ?>

<div class="container">
    <div class="page-title">Gestionare <span>servicii</span></div>
    <div class="page-subtitle">Adaugă, editează sau dezactivează serviciile oferite de servis.</div>

    <?php if ($error): ?>
        <div class="alert alert-error"><?= htmlspecialchars($error) ?></div>
    <?php endif; ?>
    <?php if ($success): ?>
        <div class="alert alert-success"><?= htmlspecialchars($success) ?></div>
    <?php endif; ?>

    <!-- Adauga serviciu nou -->
    <div class="adauga-form">
        <h3>+ Serviciu nou</h3>
        <form method="POST">
            <input type="hidden" name="actiune" value="adauga">
            <div class="fg3">
                <div class="form-group">
                    <label>Nume serviciu *</label>
                    <input type="text" name="nume" placeholder="ex: Schimb anvelope" required>
                </div>
                <div class="form-group">
                    <label>Durată estimată</label>
                    <select name="durata_ore">
                        <option value="2">2 ore</option>
                        <option value="4">4 ore (zi întreagă)</option>
                    </select>
                </div>
                <div class="form-group" style="display:flex;align-items:flex-end;">
                    <button type="submit" class="btn btn-primary" style="width:100%;">Adaugă</button>
                </div>
            </div>
            <div class="form-group" style="margin-bottom:0;">
                <label>Descriere (opțional)</label>
                <input type="text" name="descriere" placeholder="Descriere scurtă afișată pe site...">
            </div>
        </form>
    </div>

    <!-- Lista servicii -->
    <div class="svc-list" id="svc-list">
        <?php if (empty($servicii)): ?>
            <div class="card" style="text-align:center;color:var(--grey);padding:2rem;">
                Niciun serviciu adăugat încă.
            </div>
        <?php endif; ?>
        <?php foreach ($servicii as $s): ?>
        <div class="svc-row <?= $s['activ'] ? 'activ' : 'inactiv' ?>" data-id="<?= $s['id'] ?>" draggable="true">
            <div class="drag-handle" title="Trage pentru reordonare">⠿</div>
            <div class="svc-info">
                <h3><?= htmlspecialchars($s['nume']) ?></h3>
                <div class="meta">
                    <span>⏱ <?= $s['durata_ore'] ?> ore</span>
                    <span><?= $s['activ'] ? '✓ Activ' : '✕ Inactiv' ?></span>
                </div>
                <?php if ($s['descriere']): ?>
                    <div class="descr"><?= htmlspecialchars($s['descriere']) ?></div>
                <?php endif; ?>
            </div>
            <div class="svc-actions">
                <button class="btn-edit-svc" onclick="openEdit(<?= $s['id'] ?>, '<?= htmlspecialchars(addslashes($s['nume'])) ?>', '<?= htmlspecialchars(addslashes($s['descriere'] ?? '')) ?>', <?= $s['durata_ore'] ?>, <?= $s['activ'] ?>)">Editează</button>
                <form method="POST" style="display:inline;">
                    <input type="hidden" name="actiune" value="toggle">
                    <input type="hidden" name="serviciu_id" value="<?= $s['id'] ?>">
                    <button type="submit" class="btn-toggle <?= $s['activ'] ? '' : 'off' ?>"><?= $s['activ'] ? 'Dezactivează' : 'Activează' ?></button>
                </form>
                <form method="POST" style="display:inline;" onsubmit="return confirm('Ștergi serviciul <?= htmlspecialchars(addslashes($s['nume'])) ?>?')">
                    <input type="hidden" name="actiune" value="sterge">
                    <input type="hidden" name="serviciu_id" value="<?= $s['id'] ?>">
                    <button type="submit" class="btn-del-svc">Șterge</button>
                </form>
            </div>
        </div>
        <?php endforeach; ?>
    </div>

    <div class="alert alert-info" style="font-size:0.85rem;">
        <strong>Reordonare:</strong> Trage rândurile cu ⠿ pentru a schimba ordinea în care apar serviciile. Ordinea se salvează automat.
    </div>
</div>

<!-- Modal editare -->
<div class="modal" id="modal-edit">
    <div class="modal-box">
        <h3>Editează <span style="color:var(--red)">serviciul</span></h3>
        <form method="POST">
            <input type="hidden" name="actiune" value="editeaza">
            <input type="hidden" name="serviciu_id" id="edit-id">
            <div class="form-group">
                <label>Nume serviciu *</label>
                <input type="text" name="nume" id="edit-nume" required>
            </div>
            <div class="form-group">
                <label>Descriere</label>
                <input type="text" name="descriere" id="edit-descriere" placeholder="Descriere scurtă...">
            </div>
            <div class="form-group">
                <label>Durată estimată</label>
                <select name="durata_ore" id="edit-durata">
                    <option value="2">2 ore</option>
                    <option value="4">4 ore (zi întreagă)</option>
                </select>
            </div>
            <div class="form-group">
                <label style="display:flex;align-items:center;gap:0.5rem;cursor:pointer;">
                    <input type="checkbox" name="activ" id="edit-activ" value="1" style="width:auto;accent-color:var(--red);">
                    Serviciu activ (vizibil pe site)
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
// Modal editare
function openEdit(id, nume, descr, durata, activ) {
    document.getElementById('edit-id').value     = id;
    document.getElementById('edit-nume').value   = nume;
    document.getElementById('edit-descriere').value = descr;
    document.getElementById('edit-durata').value = durata;
    document.getElementById('edit-activ').checked= activ == 1;
    document.getElementById('modal-edit').classList.add('open');
}
function closeEdit() {
    document.getElementById('modal-edit').classList.remove('open');
}
document.getElementById('modal-edit').addEventListener('click', function(e) {
    if (e.target === this) closeEdit();
});

// Drag & drop reordonare
const list = document.getElementById('svc-list');
let dragged = null;

list.querySelectorAll('.svc-row').forEach(row => {
    row.addEventListener('dragstart', function() {
        dragged = this;
        setTimeout(() => this.classList.add('dragging'), 0);
    });
    row.addEventListener('dragend', function() {
        this.classList.remove('dragging');
        list.querySelectorAll('.svc-row').forEach(r => r.classList.remove('drag-over'));
        salveazaOrdine();
    });
    row.addEventListener('dragover', function(e) {
        e.preventDefault();
        list.querySelectorAll('.svc-row').forEach(r => r.classList.remove('drag-over'));
        if (this !== dragged) this.classList.add('drag-over');
    });
    row.addEventListener('drop', function(e) {
        e.preventDefault();
        if (this !== dragged) {
            const rows = [...list.querySelectorAll('.svc-row')];
            const dragIdx = rows.indexOf(dragged);
            const dropIdx = rows.indexOf(this);
            if (dragIdx < dropIdx) {
                this.after(dragged);
            } else {
                this.before(dragged);
            }
        }
    });
});

function salveazaOrdine() {
    const rows  = list.querySelectorAll('.svc-row');
    const ordine = {};
    rows.forEach((r, i) => { ordine[r.dataset.id] = i + 1; });

    const fd = new FormData();
    fd.append('actiune', 'reordoneaza');
    for (const [id, ord] of Object.entries(ordine)) {
        fd.append('ordine[' + id + ']', ord);
    }
    fetch('/admin/servicii.php', { method: 'POST', body: fd });
}
</script>
</body>
</html>
