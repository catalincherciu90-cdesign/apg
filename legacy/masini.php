<?php
require_once __DIR__ . '/src/config/config.php';
require_once __DIR__ . '/src/config/db.php';
require_once __DIR__ . '/src/helpers/Auth.php';

Auth::requireLogin();
if (Auth::isAngajat()) { header('Location: /admin/index.php'); exit; }

$error   = '';
$success = '';

// Adauga masina
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['actiune'])) {

    if ($_POST['actiune'] === 'adauga') {
        $nr    = strtoupper(trim($_POST['nr_inmatriculare'] ?? ''));
        $prod  = trim($_POST['producator'] ?? '');
        $model = trim($_POST['model'] ?? '');
        $serie = strtoupper(trim($_POST['serie_caroserie'] ?? ''));

        if (!$nr || !$prod || !$model) {
            $error = 'Completează numărul de înmatriculare, producătorul și modelul.';
        } else {
            // Verifica duplicat
            $stmt = $pdo->prepare('SELECT id FROM masini WHERE user_id = ? AND nr_inmatriculare = ?');
            $stmt->execute([$_SESSION['user_id'], $nr]);
            if ($stmt->fetch()) {
                $error = 'Ai deja o mașină cu acest număr de înmatriculare.';
            } else {
                $pdo->prepare('INSERT INTO masini (user_id, nr_inmatriculare, producator, model, serie_caroserie) VALUES (?, ?, ?, ?, ?)')
                    ->execute([$_SESSION['user_id'], $nr, $prod, $model, $serie]);
                $success = 'Mașina a fost adăugată în contul tău.';
            }
        }
    }

    if ($_POST['actiune'] === 'sterge') {
        $id = intval($_POST['masina_id']);
        $pdo->prepare('DELETE FROM masini WHERE id = ? AND user_id = ?')->execute([$id, $_SESSION['user_id']]);
        $success = 'Mașina a fost ștearsă.';
    }

    if ($_POST['actiune'] === 'editeaza') {
        $id    = intval($_POST['masina_id']);
        $nr    = strtoupper(trim($_POST['nr_inmatriculare'] ?? ''));
        $prod  = trim($_POST['producator'] ?? '');
        $model = trim($_POST['model'] ?? '');
        $serie = strtoupper(trim($_POST['serie_caroserie'] ?? ''));

        if (!$nr || !$prod || !$model) {
            $error = 'Completează toate câmpurile obligatorii.';
        } else {
            $pdo->prepare('UPDATE masini SET nr_inmatriculare=?, producator=?, model=?, serie_caroserie=? WHERE id=? AND user_id=?')
                ->execute([$nr, $prod, $model, $serie, $id, $_SESSION['user_id']]);
            $success = 'Datele mașinii au fost actualizate.';
        }
    }
}

// Incarca masinile cu ultima revizie din programari
$stmt = $pdo->prepare("
    SELECT m.*,
        (SELECT MAX(r.data) FROM rezervari r
         WHERE r.user_id = m.user_id
         AND r.nr_inmatriculare = m.nr_inmatriculare
         AND r.serviciu_tip IN ('revizie')
         AND r.status = 'finalizat') as ultima_revizie_auto,
        (SELECT COUNT(*) FROM rezervari r
         WHERE r.user_id = m.user_id
         AND r.nr_inmatriculare = m.nr_inmatriculare) as nr_programari
    FROM masini m
    WHERE m.user_id = ?
    ORDER BY m.created_at DESC
");
$stmt->execute([$_SESSION['user_id']]);
$masini = $stmt->fetchAll();

// Sincronizeaza data reviziei automat
foreach ($masini as $m) {
    if ($m['ultima_revizie_auto'] && $m['ultima_revizie_auto'] !== $m['data_ultima_revizie']) {
        $pdo->prepare('UPDATE masini SET data_ultima_revizie = ?, notificare_trimisa = 0 WHERE id = ?')
            ->execute([$m['ultima_revizie_auto'], $m['id']]);
    }
}

// Reincarca dupa sincronizare
$stmt->execute([$_SESSION['user_id']]);
$masini = $stmt->fetchAll();
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
    <title>Mașinile mele — APG Garage</title>
    <link rel="stylesheet" href="/css/style.css">
    <style>
        .masina-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
            gap: 1.2rem;
            margin-bottom: 2rem;
        }

        .masina-card {
            background: var(--dark2);
            border: 1px solid var(--border);
            border-top: 4px solid var(--border);
            padding: 1.5rem;
            position: relative;
        }
        .masina-card.ok     { border-top-color: #2ecc71; }
        .masina-card.warn   { border-top-color: #f0a500; }
        .masina-card.danger { border-top-color: var(--red); }
        .masina-card.nodata { border-top-color: var(--grey); }

        .masina-nr {
            font-family: 'Barlow Condensed', sans-serif;
            font-size: 1.6rem;
            font-weight: 800;
            letter-spacing: 3px;
            text-transform: uppercase;
            margin-bottom: 0.3rem;
        }
        .masina-model {
            color: var(--grey);
            font-size: 0.9rem;
            margin-bottom: 1rem;
        }

        .masina-info { display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem 1rem; margin-bottom: 1rem; }
        .masina-info-row { display: flex; flex-direction: column; }
        .masina-info-row .lbl { font-size: 0.68rem; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase; color: var(--grey); }
        .masina-info-row .val { font-size: 0.88rem; color: var(--white); }

        .revizie-status {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            padding: 0.6rem 0.8rem;
            margin-bottom: 1rem;
            font-size: 0.82rem;
            font-weight: 600;
        }
        .revizie-status.ok     { background: #0b2c13; color: #2ecc71; }
        .revizie-status.warn   { background: #2c1f00; color: #f0a500; }
        .revizie-status.danger { background: #2c0b0b; color: var(--red); }
        .revizie-status.nodata { background: #1a1a1a; color: var(--grey); }

        .masina-actions { display: flex; gap: 0.5rem; }
        .masina-actions button, .masina-actions a {
            flex: 1;
            padding: 0.45rem 0.5rem;
            font-family: 'Barlow Condensed', sans-serif;
            font-size: 0.82rem;
            font-weight: 700;
            letter-spacing: 1px;
            text-transform: uppercase;
            cursor: pointer;
            border: 1px solid;
            background: none;
            text-align: center;
            text-decoration: none;
            transition: all 0.15s;
        }
        .btn-edit   { border-color: var(--border); color: var(--grey); }
        .btn-edit:hover { border-color: var(--white); color: var(--white); }
        .btn-prog   { border-color: var(--red); color: var(--red); background: none; }
        .btn-prog:hover { background: var(--red); color: var(--white); }
        .btn-del    { border-color: #333; color: #555; }
        .btn-del:hover { border-color: var(--red); color: var(--red); }

        /* Modal editare */
        .modal { display:none; position:fixed; inset:0; background:rgba(0,0,0,0.85); z-index:999; align-items:center; justify-content:center; padding:1rem; }
        .modal.open { display:flex; }
        .modal-box { background: var(--dark2); border: 1px solid var(--border); padding: 1.5rem; width:100%; max-width:460px; }
        .modal-box h3 { font-family:'Barlow Condensed',sans-serif; font-size:1.4rem; font-weight:800; text-transform:uppercase; margin-bottom:1rem; }

        .adauga-card { background: var(--dark2); border: 1px dashed var(--border); padding: 1.5rem; }

        @media (max-width: 500px) {
            .masina-grid { grid-template-columns: 1fr; }
        }
    </style>
</head>
<body>

<?php require_once __DIR__ . '/src/views/nav.php'; ?>

<div class="container">
    <div class="page-title">Mașinile <span>mele</span></div>
    <div class="page-subtitle">Urmărește istoricul și reviziile mașinilor tale</div>

    <?php if ($error): ?>
        <div class="alert alert-error"><?= htmlspecialchars($error) ?></div>
    <?php endif; ?>
    <?php if ($success): ?>
        <div class="alert alert-success"><?= htmlspecialchars($success) ?></div>
    <?php endif; ?>

    <div class="masina-grid">
        <?php foreach ($masini as $m):
            $revizie = $m['data_ultima_revizie'];
            $zile_de_la_revizie = $revizie ? (int)((time() - strtotime($revizie)) / 86400) : null;
            $zile_pana_la_an    = $revizie ? 365 - $zile_de_la_revizie : null;

            if (!$revizie) {
                $status = 'nodata';
                $status_text = 'Nicio revizie înregistrată';
            } elseif ($zile_de_la_revizie >= 365) {
                $status = 'danger';
                $status_text = 'Revizie depășită cu ' . ($zile_de_la_revizie - 365) . ' zile';
            } elseif ($zile_pana_la_an <= 30) {
                $status = 'warn';
                $status_text = 'Revizie necesară în ' . $zile_pana_la_an . ' zile';
            } else {
                $status = 'ok';
                $status_text = 'Revizie la zi — mai sunt ' . $zile_pana_la_an . ' zile';
            }

            $icon = ['ok' => '✓', 'warn' => '⚠', 'danger' => '✕', 'nodata' => '—'][$status];
        ?>
        <div class="masina-card <?= $status ?>">
            <div class="masina-nr"><?= htmlspecialchars($m['nr_inmatriculare']) ?></div>
            <div class="masina-model"><?= htmlspecialchars($m['producator'] . ' ' . $m['model']) ?></div>

            <div class="masina-info">
                <div class="masina-info-row">
                    <span class="lbl">Serie caroserie</span>
                    <span class="val"><?= htmlspecialchars($m['serie_caroserie'] ?: '—') ?></span>
                </div>
                <div class="masina-info-row">
                    <span class="lbl">Programări</span>
                    <span class="val"><?= $m['nr_programari'] ?></span>
                </div>
                <div class="masina-info-row" style="grid-column:1/-1;">
                    <span class="lbl">Ultima revizie</span>
                    <span class="val"><?= $revizie ? date('d.m.Y', strtotime($revizie)) : '—' ?></span>
                </div>
            </div>

            <div class="revizie-status <?= $status ?>">
                <span><?= $icon ?></span>
                <span><?= $status_text ?></span>
            </div>

            <div class="masina-actions">
                <button class="btn-edit" onclick="openEdit(<?= $m['id'] ?>, '<?= htmlspecialchars($m['nr_inmatriculare']) ?>', '<?= htmlspecialchars($m['producator']) ?>', '<?= htmlspecialchars($m['model']) ?>', '<?= htmlspecialchars($m['serie_caroserie'] ?? '') ?>')">Editează</button>
                <a href="/rezervare.php" class="btn-prog">Programare</a>
                <button class="btn-del" onclick="confirmaStergere(<?= $m['id'] ?>, '<?= htmlspecialchars($m['nr_inmatriculare']) ?>')">Șterge</button>
            </div>
        </div>
        <?php endforeach; ?>

        <!-- Card adauga masina noua -->
        <div class="adauga-card">
            <div class="section-label">Adaugă mașină</div>
            <form method="POST">
                <input type="hidden" name="actiune" value="adauga">
                <div class="form-group">
                    <label>Număr înmatriculare *</label>
                    <input type="text" name="nr_inmatriculare" placeholder="ex: B 123 ABC" style="text-transform:uppercase;" required>
                </div>
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:0 1rem;">
                    <div class="form-group">
                        <label>Producător *</label>
                        <input type="text" name="producator" placeholder="ex: Volkswagen" required>
                    </div>
                    <div class="form-group">
                        <label>Model *</label>
                        <input type="text" name="model" placeholder="ex: Golf 7" required>
                    </div>
                </div>
                <div class="form-group">
                    <label>Serie caroserie (VIN)</label>
                    <input type="text" name="serie_caroserie" placeholder="ex: WVWZZZ1KZ..." style="text-transform:uppercase;">
                </div>
                <button type="submit" class="btn btn-primary" style="width:100%;">Adaugă mașina</button>
            </form>
        </div>
    </div>
</div>

<!-- Modal editare -->
<div class="modal" id="modal-edit">
    <div class="modal-box">
        <h3>Editează <span style="color:var(--red)">mașina</span></h3>
        <form method="POST">
            <input type="hidden" name="actiune" value="editeaza">
            <input type="hidden" name="masina_id" id="edit-id">
            <div class="form-group">
                <label>Număr înmatriculare *</label>
                <input type="text" name="nr_inmatriculare" id="edit-nr" style="text-transform:uppercase;" required>
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:0 1rem;">
                <div class="form-group">
                    <label>Producător *</label>
                    <input type="text" name="producator" id="edit-prod" required>
                </div>
                <div class="form-group">
                    <label>Model *</label>
                    <input type="text" name="model" id="edit-model" required>
                </div>
            </div>
            <div class="form-group">
                <label>Serie caroserie (VIN)</label>
                <input type="text" name="serie_caroserie" id="edit-serie" style="text-transform:uppercase;">
            </div>
            <div style="display:flex;gap:1rem;margin-top:0.5rem;">
                <button type="submit" class="btn btn-primary">Salvează</button>
                <button type="button" class="btn btn-outline" onclick="closeEdit()">Anulează</button>
            </div>
        </form>
    </div>
</div>

<!-- Form stergere hidden -->
<form method="POST" id="form-sterge" style="display:none;">
    <input type="hidden" name="actiune" value="sterge">
    <input type="hidden" name="masina_id" id="sterge-id">
</form>

<footer>© <?= date('Y') ?> APG Garage. Toate drepturile rezervate.</footer>

<script>
function openEdit(id, nr, prod, model, serie) {
    document.getElementById('edit-id').value    = id;
    document.getElementById('edit-nr').value    = nr;
    document.getElementById('edit-prod').value  = prod;
    document.getElementById('edit-model').value = model;
    document.getElementById('edit-serie').value = serie;
    document.getElementById('modal-edit').classList.add('open');
}
function closeEdit() {
    document.getElementById('modal-edit').classList.remove('open');
}
document.getElementById('modal-edit').addEventListener('click', function(e) {
    if (e.target === this) closeEdit();
});
function confirmaStergere(id, nr) {
    if (confirm('Ștergi mașina ' + nr + '? Această acțiune nu poate fi anulată.')) {
        document.getElementById('sterge-id').value = id;
        document.getElementById('form-sterge').submit();
    }
}
</script>
</body>
</html>
