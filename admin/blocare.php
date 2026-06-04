<?php
require_once __DIR__ . '/../src/config/config.php';
require_once __DIR__ . '/../src/config/db.php';
require_once __DIR__ . '/../src/helpers/Auth.php';

Auth::requireLogin();
Auth::requireAngajat();

$error   = '';
$success = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if (isset($_POST['adauga'])) {
        $data  = $_POST['data'] ?? '';
        $motiv = trim($_POST['motiv'] ?? '');
        if (!$data) {
            $error = 'Alege o dată.';
        } else {
            try {
                $stmt = $pdo->prepare('INSERT INTO zile_blocate (data, motiv) VALUES (?, ?)');
                $stmt->execute([$data, $motiv]);
                $success = 'Ziua a fost blocată.';
            } catch (Exception $e) {
                $error = 'Această dată este deja blocată.';
            }
        }
    } elseif (isset($_POST['sterge'])) {
        $id = intval($_POST['zi_id']);
        $pdo->prepare('DELETE FROM zile_blocate WHERE id = ?')->execute([$id]);
        $success = 'Ziua a fost deblocată.';
    }
}

$zile = $pdo->query('SELECT * FROM zile_blocate ORDER BY data ASC')->fetchAll();
?>
<!DOCTYPE html>
<html lang="ro">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Zile blocate — APG Garage</title>
    <link rel="stylesheet" href="/css/style.css">
</head>
<body>

<?php require_once __DIR__ . '/../src/views/nav_admin.php'; ?>

<div class="container" style="max-width:700px;">
    <div class="page-title">Zile <span>blocate</span></div>
    <div class="page-subtitle">Marchează zilele în care servisul nu primește programări</div>

    <?php if ($error): ?>
        <div class="alert alert-error"><?= htmlspecialchars($error) ?></div>
    <?php endif; ?>
    <?php if ($success): ?>
        <div class="alert alert-success"><?= htmlspecialchars($success) ?></div>
    <?php endif; ?>

    <div class="card">
        <form method="POST" style="display:flex;gap:1rem;flex-wrap:wrap;align-items:flex-end;">
            <div class="form-group" style="margin:0;flex:1;min-width:160px;">
                <label>Dată</label>
                <input type="date" name="data" min="<?= date('Y-m-d') ?>" required>
            </div>
            <div class="form-group" style="margin:0;flex:2;min-width:200px;">
                <label>Motiv (opțional)</label>
                <input type="text" name="motiv" placeholder="ex: Zi liberă, Concediu">
            </div>
            <button type="submit" name="adauga" class="btn btn-primary" style="margin-bottom:0;">Blochează ziua</button>
        </form>
    </div>

    <?php if (empty($zile)): ?>
        <div class="card" style="text-align:center;color:var(--grey);padding:2rem;">Nicio zi blocată momentan.</div>
    <?php else: ?>
        <div class="card" style="padding:0;">
            <table>
                <thead>
                    <tr>
                        <th>Data</th>
                        <th>Zi</th>
                        <th>Motiv</th>
                        <th></th>
                    </tr>
                </thead>
                <tbody>
                <?php
                $zile_ro = ['','Luni','Marți','Miercuri','Joi','Vineri','Sâmbătă','Duminică'];
                foreach ($zile as $z):
                    $nr_zi = date('N', strtotime($z['data']));
                ?>
                    <tr>
                        <td><?= date('d.m.Y', strtotime($z['data'])) ?></td>
                        <td><?= $zile_ro[$nr_zi] ?></td>
                        <td style="color:var(--grey)"><?= htmlspecialchars($z['motiv'] ?: '-') ?></td>
                        <td>
                            <form method="POST" onsubmit="return confirm('Deblochezi această zi?')">
                                <input type="hidden" name="zi_id" value="<?= $z['id'] ?>">
                                <button type="submit" name="sterge" class="btn btn-danger" style="padding:0.3rem 0.8rem;font-size:0.8rem;">Deblochează</button>
                            </form>
                        </td>
                    </tr>
                <?php endforeach; ?>
                </tbody>
            </table>
        </div>
    <?php endif; ?>
</div>

<footer>© <?= date('Y') ?> APG Garage. Toate drepturile rezervate.</footer>
</body>
</html>
