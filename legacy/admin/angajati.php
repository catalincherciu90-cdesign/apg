<?php
require_once __DIR__ . '/../src/config/config.php';
require_once __DIR__ . '/../src/config/db.php';
require_once __DIR__ . '/../src/helpers/Auth.php';
require_once __DIR__ . '/../src/helpers/Permisiuni.php';

Auth::requireLogin();
Auth::requireAngajat();

// Doar superadminul poate gestiona angajatii
if (!Permisiuni::isSuperAdmin()) {
    header('Location: /admin/index.php?eroare=acces');
    exit;
}

$success = '';
$error   = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $actiune = $_POST['actiune'] ?? '';

    // Adauga angajat nou
    if ($actiune === 'adauga') {
        $nume    = trim($_POST['nume'] ?? '');
        $email   = trim($_POST['email'] ?? '');
        $telefon = trim($_POST['telefon'] ?? '');
        $parola  = $_POST['parola'] ?? '';
        $perm    = $_POST['permisiuni'] ?? [];

        if (!$nume || !$email || !$parola) {
            $error = 'Completează numele, emailul și parola.';
        } elseif (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            $error = 'Adresa de email nu este validă.';
        } elseif (strlen($parola) < 6) {
            $error = 'Parola trebuie să aibă minim 6 caractere.';
        } else {
            $stmt = $pdo->prepare('SELECT id FROM users WHERE email = ?');
            $stmt->execute([$email]);
            if ($stmt->fetch()) {
                $error = 'Există deja un cont cu această adresă de email.';
            } else {
                $hash = password_hash($parola, PASSWORD_DEFAULT);
                $perm_json = json_encode(array_values($perm));
                $pdo->prepare('INSERT INTO users (nume, email, parola, telefon, rol, permisiuni) VALUES (?, ?, ?, ?, "angajat", ?)')
                    ->execute([$nume, $email, $hash, $telefon, $perm_json]);
                $success = 'Contul de angajat a fost creat.';
            }
        }
    }

    // Actualizeaza permisiuni
    if ($actiune === 'permisiuni') {
        $user_id = intval($_POST['user_id']);
        $perm    = $_POST['permisiuni'] ?? [];
        $perm_json = json_encode(array_values($perm));
        $pdo->prepare('UPDATE users SET permisiuni = ? WHERE id = ? AND rol = "angajat"')
            ->execute([$perm_json, $user_id]);
        $success = 'Permisiunile au fost actualizate.';

        // Actualizeaza sesiunea daca e userul curent
        if ($user_id === $_SESSION['user_id']) {
            $_SESSION['permisiuni'] = $perm;
        }
    }

    // Reseteaza parola
    if ($actiune === 'reset_parola') {
        $user_id = intval($_POST['user_id']);
        $parola  = $_POST['parola_noua'] ?? '';
        if (strlen($parola) < 6) {
            $error = 'Parola trebuie să aibă minim 6 caractere.';
        } else {
            $hash = password_hash($parola, PASSWORD_DEFAULT);
            $pdo->prepare('UPDATE users SET parola = ? WHERE id = ? AND rol = "angajat"')
                ->execute([$hash, $user_id]);
            $success = 'Parola a fost resetată.';
        }
    }

    // Dezactiveaza / Activeaza cont
    if ($actiune === 'toggle_cont') {
        $user_id = intval($_POST['user_id']);
        // Folosim un camp simplu — marcam cu permisiuni goale = dezactivat
        $stmt = $pdo->prepare('SELECT permisiuni FROM users WHERE id = ?');
        $stmt->execute([$user_id]);
        $row = $stmt->fetch();
        $perm = json_decode($row['permisiuni'] ?? '[]', true);

        if (empty($perm)) {
            // Era dezactivat, il reactivam cu permisiuni default
            $pdo->prepare('UPDATE users SET permisiuni = ? WHERE id = ?')
                ->execute([json_encode(['programari']), $user_id]);
            $success = 'Contul a fost activat.';
        } else {
            // Il dezactivam
            $pdo->prepare('UPDATE users SET permisiuni = "[]" WHERE id = ?')
                ->execute([$user_id]);
            $success = 'Contul a fost dezactivat.';
        }
    }

    // Sterge cont
    if ($actiune === 'sterge') {
        $user_id = intval($_POST['user_id']);
        if ($user_id === $_SESSION['user_id']) {
            $error = 'Nu îți poți șterge propriul cont.';
        } else {
            $pdo->prepare('DELETE FROM users WHERE id = ? AND rol = "angajat"')->execute([$user_id]);
            $success = 'Contul a fost șters.';
        }
    }
}

// Incarca toti angajatii
$angajati = $pdo->query("SELECT id, nume, email, telefon, permisiuni, created_at FROM users WHERE rol = 'angajat' ORDER BY created_at DESC")->fetchAll();

$sectiuni = Permisiuni::LABELS;
?>
<!DOCTYPE html>
<html lang="ro">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Angajați — Admin APG Garage</title>
    <link rel="stylesheet" href="/css/style.css">
    <style>
        .angajat-card {
            background: var(--dark2);
            border: 1px solid var(--border);
            border-left: 4px solid var(--border);
            padding: 1.5rem;
            margin-bottom: 1.2rem;
        }
        .angajat-card.activ   { border-left-color: #2ecc71; }
        .angajat-card.inactiv { border-left-color: #444; opacity: 0.7; }

        .angajat-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            gap: 1rem;
            margin-bottom: 1rem;
            flex-wrap: wrap;
        }
        .angajat-info h3 {
            font-family: 'Barlow Condensed', sans-serif;
            font-size: 1.2rem;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 1px;
            margin-bottom: 0.2rem;
        }
        .angajat-info .meta { color: var(--grey); font-size: 0.85rem; }

        /* Grid permisiuni */
        .perm-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
            gap: 0.5rem;
            margin-bottom: 1rem;
        }
        .perm-item {
            display: flex;
            align-items: center;
            gap: 0.6rem;
            background: var(--black);
            border: 1px solid var(--border);
            padding: 0.5rem 0.8rem;
            font-size: 0.85rem;
            cursor: pointer;
            transition: border-color 0.15s;
            user-select: none;
        }
        .perm-item:hover { border-color: var(--red); }
        .perm-item.on { border-color: #2ecc71; background: rgba(46,204,113,0.06); }
        .perm-item input { width: auto; accent-color: #2ecc71; }

        .angajat-actions {
            display: flex;
            gap: 0.5rem;
            flex-wrap: wrap;
            padding-top: 1rem;
            border-top: 1px solid var(--border);
            margin-top: 1rem;
        }
        .angajat-actions button {
            padding: 0.4rem 0.9rem;
            font-family: 'Barlow Condensed', sans-serif;
            font-size: 0.82rem;
            font-weight: 700;
            letter-spacing: 1px;
            text-transform: uppercase;
            cursor: pointer;
            border: 1px solid;
            background: none;
            transition: all 0.15s;
        }
        .btn-save-perm { border-color: #1e8449; color: #2ecc71; }
        .btn-save-perm:hover { background: #1e8449; color: #fff; }
        .btn-reset-pass { border-color: var(--border); color: var(--grey); }
        .btn-reset-pass:hover { border-color: var(--white); color: var(--white); }
        .btn-toggle-acc { border-color: #1a6a9a; color: #3498db; }
        .btn-toggle-acc:hover { background: #1a6a9a; color: #fff; }
        .btn-toggle-acc.off { border-color: #333; color: #555; }
        .btn-del-ang { border-color: #333; color: #555; }
        .btn-del-ang:hover { border-color: var(--red); color: var(--red); }

        /* Form adaugare */
        .adauga-form {
            background: var(--dark2);
            border: 1px solid var(--border);
            border-top: 4px solid var(--red);
            padding: 1.8rem;
            margin-bottom: 2rem;
        }
        .adauga-form h3 {
            font-family: 'Barlow Condensed', sans-serif;
            font-size: 1.2rem;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 1px;
            margin-bottom: 1.2rem;
        }
        .fg2 { display: grid; grid-template-columns: 1fr 1fr; gap: 0 1rem; }
        @media (max-width: 600px) { .fg2 { grid-template-columns: 1fr; } .perm-grid { grid-template-columns: 1fr; } }

        /* Modal reset parola */
        .modal { display:none; position:fixed; inset:0; background:rgba(0,0,0,0.85); z-index:999; align-items:center; justify-content:center; padding:1rem; }
        .modal.open { display:flex; }
        .modal-box { background:var(--dark2); border:1px solid var(--border); padding:1.8rem; width:100%; max-width:420px; }
        .modal-box h3 { font-family:'Barlow Condensed',sans-serif; font-size:1.3rem; font-weight:800; text-transform:uppercase; margin-bottom:1rem; }
    </style>
</head>
<body>
<?php require_once __DIR__ . '/../src/views/nav_admin.php'; ?>

<div class="container">
    <div class="page-title">Gestionare <span>angajați</span></div>
    <div class="page-subtitle">Creează conturi și setează accesul fiecărui angajat.</div>

    <?php if ($success): ?><div class="alert alert-success"><?= htmlspecialchars($success) ?></div><?php endif; ?>
    <?php if ($error):   ?><div class="alert alert-error"><?= htmlspecialchars($error) ?></div><?php endif; ?>

    <!-- Formular angajat nou -->
    <div class="adauga-form">
        <h3>+ Angajat nou</h3>
        <form method="POST">
            <input type="hidden" name="actiune" value="adauga">
            <div class="fg2">
                <div class="form-group">
                    <label>Nume complet *</label>
                    <input type="text" name="nume" placeholder="ex: Ion Popescu" required>
                </div>
                <div class="form-group">
                    <label>Email *</label>
                    <input type="email" name="email" placeholder="angajat@apg-garage.ro" required>
                </div>
                <div class="form-group">
                    <label>Telefon</label>
                    <input type="tel" name="telefon" placeholder="07xx xxx xxx">
                </div>
                <div class="form-group">
                    <label>Parolă * (minim 6 caractere)</label>
                    <input type="password" name="parola" required>
                </div>
            </div>
            <div class="form-group">
                <label style="margin-bottom:0.6rem;">Acces la secțiuni</label>
                <div class="perm-grid" id="perm-grid-nou">
                    <?php foreach ($sectiuni as $key => $label): ?>
                        <label class="perm-item" onclick="this.classList.toggle('on', this.querySelector('input').checked)">
                            <input type="checkbox" name="permisiuni[]" value="<?= $key ?>">
                            <?= $label ?>
                        </label>
                    <?php endforeach; ?>
                </div>
            </div>
            <button type="submit" class="btn btn-primary">Creează contul</button>
        </form>
    </div>

    <!-- Lista angajati -->
    <?php if (empty($angajati)): ?>
        <div class="card" style="text-align:center;color:var(--grey);padding:2rem;">Niciun angajat adăugat încă.</div>
    <?php else: ?>
        <?php foreach ($angajati as $a):
            $perm_user = json_decode($a['permisiuni'] ?? '[]', true) ?: [];
            $este_activ = !empty($perm_user);
            $este_superadmin = count(array_intersect(array_keys($sectiuni), $perm_user)) === count($sectiuni);
        ?>
        <div class="angajat-card <?= $este_activ ? 'activ' : 'inactiv' ?>">
            <div class="angajat-header">
                <div class="angajat-info">
                    <h3>
                        <?= htmlspecialchars($a['nume']) ?>
                        <?php if ($este_superadmin): ?>
                            <span style="font-size:0.7rem;color:#f0a500;background:#2a2000;padding:0.1rem 0.5rem;letter-spacing:1px;vertical-align:middle;">SUPERADMIN</span>
                        <?php endif; ?>
                    </h3>
                    <div class="meta">
                        <?= htmlspecialchars($a['email']) ?>
                        <?= $a['telefon'] ? ' · ' . htmlspecialchars($a['telefon']) : '' ?>
                        · Creat: <?= date('d.m.Y', strtotime($a['created_at'])) ?>
                    </div>
                </div>
                <span class="badge <?= $este_activ ? 'badge-confirmat' : 'badge-respins' ?>">
                    <?= $este_activ ? 'Activ' : 'Dezactivat' ?>
                </span>
            </div>

            <!-- Permisiuni -->
            <form method="POST">
                <input type="hidden" name="actiune" value="permisiuni">
                <input type="hidden" name="user_id" value="<?= $a['id'] ?>">
                <div class="form-group" style="margin-bottom:0.8rem;">
                    <label style="margin-bottom:0.5rem;">Acces la secțiuni</label>
                    <div class="perm-grid">
                        <?php foreach ($sectiuni as $key => $label):
                            $are_acces = in_array($key, $perm_user);
                        ?>
                            <label class="perm-item <?= $are_acces ? 'on' : '' ?>"
                                   onchange="this.classList.toggle('on', this.querySelector('input').checked)">
                                <input type="checkbox" name="permisiuni[]" value="<?= $key ?>" <?= $are_acces ? 'checked' : '' ?>>
                                <?= $label ?>
                            </label>
                        <?php endforeach; ?>
                    </div>
                </div>
                <div class="angajat-actions">
                    <button type="submit" class="btn-save-perm">✓ Salvează permisiunile</button>
                    <button type="button" class="btn-reset-pass" onclick="openResetPass(<?= $a['id'] ?>, '<?= htmlspecialchars(addslashes($a['nume'])) ?>')">Resetează parola</button>
                    <button type="button" class="btn-toggle-acc <?= $este_activ ? '' : 'off' ?>"
                            onclick="submitToggle(<?= $a['id'] ?>)">
                        <?= $este_activ ? 'Dezactivează' : 'Activează' ?>
                    </button>
                    <?php if ($a['id'] !== $_SESSION['user_id']): ?>
                        <button type="button" class="btn-del-ang"
                                onclick="submitSterge(<?= $a['id'] ?>, '<?= htmlspecialchars(addslashes($a['nume'])) ?>')">
                            Șterge
                        </button>
                    <?php endif; ?>
                </div>
            </form>
        </div>
        <?php endforeach; ?>
    <?php endif; ?>
</div>

<!-- Modal reset parola -->
<div class="modal" id="modal-parola">
    <div class="modal-box">
        <h3>Resetează <span style="color:var(--red)">parola</span></h3>
        <p style="color:var(--grey);font-size:0.88rem;margin-bottom:1rem;" id="modal-parola-nume"></p>
        <form method="POST">
            <input type="hidden" name="actiune" value="reset_parola">
            <input type="hidden" name="user_id" id="modal-parola-id">
            <div class="form-group">
                <label>Parolă nouă * (minim 6 caractere)</label>
                <input type="password" name="parola_noua" required minlength="6">
            </div>
            <div style="display:flex;gap:1rem;margin-top:0.5rem;">
                <button type="submit" class="btn btn-primary">Salvează</button>
                <button type="button" class="btn btn-outline" onclick="closeModal('modal-parola')">Anulează</button>
            </div>
        </form>
    </div>
</div>

<!-- Forme hidden pentru toggle si stergere -->
<form method="POST" id="form-toggle" style="display:none;">
    <input type="hidden" name="actiune" value="toggle_cont">
    <input type="hidden" name="user_id" id="toggle-id">
</form>
<form method="POST" id="form-sterge" style="display:none;">
    <input type="hidden" name="actiune" value="sterge">
    <input type="hidden" name="user_id" id="sterge-id">
</form>

<footer>© <?= date('Y') ?> APG Garage. Toate drepturile rezervate.</footer>

<script>
function openResetPass(id, nume) {
    document.getElementById('modal-parola-id').value = id;
    document.getElementById('modal-parola-nume').textContent = 'Angajat: ' + nume;
    document.getElementById('modal-parola').classList.add('open');
}
function closeModal(id) { document.getElementById(id).classList.remove('open'); }
document.getElementById('modal-parola').addEventListener('click', function(e) { if (e.target===this) closeModal('modal-parola'); });

function submitToggle(id) {
    document.getElementById('toggle-id').value = id;
    document.getElementById('form-toggle').submit();
}
function submitSterge(id, nume) {
    if (confirm('Ștergi contul lui ' + nume + '? Această acțiune nu poate fi anulată.')) {
        document.getElementById('sterge-id').value = id;
        document.getElementById('form-sterge').submit();
    }
}

// Sync checkbox cu clasa on la load
document.querySelectorAll('.perm-item input').forEach(function(cb) {
    cb.addEventListener('change', function() {
        this.closest('.perm-item').classList.toggle('on', this.checked);
    });
});
</script>
</body>
</html>
