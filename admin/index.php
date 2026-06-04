<?php
require_once __DIR__ . '/../src/config/config.php';
require_once __DIR__ . '/../src/config/db.php';
require_once __DIR__ . '/../src/helpers/Auth.php';

Auth::requireLogin();
Auth::requireAngajat();

if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['actiune'], $_POST['rez_id'])) {
    $id    = intval($_POST['rez_id']);
    $act   = $_POST['actiune'];
    $motiv = trim($_POST['motiv'] ?? '');

    $map = [
        'confirma'    => 'confirmat',
        'respinge'    => 'respins',
        'in_lucru'    => 'in_lucru',
        'finalizeaza' => 'finalizat',
    ];

    if (isset($map[$act])) {
        if ($act === 'respinge') {
            $stmt = $pdo->prepare('UPDATE rezervari SET status = ?, motiv_respingere = ? WHERE id = ?');
            $stmt->execute([$map[$act], $motiv, $id]);
        } else {
            $stmt = $pdo->prepare('UPDATE rezervari SET status = ? WHERE id = ?');
            $stmt->execute([$map[$act], $id]);
        }
    }
    header('Location: /admin/index.php');
    exit;
}

$filter_status = $_GET['status'] ?? 'toate';
$filter_data   = $_GET['data'] ?? '';

$where  = ['1=1'];
$params = [];

if ($filter_status !== 'toate') {
    $where[]  = 'r.status = ?';
    $params[] = $filter_status;
}
if ($filter_data) {
    $where[]  = 'r.data = ?';
    $params[] = $filter_data;
}

$sql = 'SELECT r.*, u.nume as client_nume, u.telefon as client_telefon, u.email as client_email
        FROM rezervari r
        JOIN users u ON u.id = r.user_id
        WHERE ' . implode(' AND ', $where) . '
        ORDER BY r.data ASC, r.ora_start ASC';

$stmt = $pdo->prepare($sql);
$stmt->execute($params);
$rezervari = $stmt->fetchAll();

$stats = $pdo->query("SELECT status, COUNT(*) as cnt FROM rezervari GROUP BY status")->fetchAll(PDO::FETCH_KEY_PAIR);

function serviciu_label($tip) {
    $map = [
        'revizie'          => 'Revizie',
        'reparatie'        => 'Reparație mecanică',
        'verificare_rampa' => 'Verificare rampă',
    ];
    return $map[$tip] ?? ucfirst($tip);
}

$status_label = [
    'asteptare' => 'În așteptare',
    'confirmat' => 'Confirmat',
    'respins'   => 'Respins',
    'in_lucru'  => 'În lucru',
    'finalizat' => 'Finalizat',
];
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
    <title>Admin — APG Garage</title>
    <link rel="stylesheet" href="/css/style.css">
    <style>
        .stats-row { display: grid; grid-template-columns: repeat(5, 1fr); gap: 1rem; margin-bottom: 2rem; }
        @media (max-width: 700px) { .stats-row { grid-template-columns: repeat(3, 1fr); gap: 0.6rem; } }
        @media (max-width: 400px) { .stats-row { grid-template-columns: repeat(2, 1fr); } }
        .stat-card { background: var(--dark2); border: 1px solid var(--border); padding: 1rem; text-align: center; }
        .stat-card .num { font-family: 'Barlow Condensed', sans-serif; font-size: 2rem; font-weight: 800; line-height: 1; }
        .stat-card .lbl { font-size: 0.7rem; color: var(--grey); letter-spacing: 1px; text-transform: uppercase; margin-top: 0.3rem; }

        .filters { display: flex; gap: 0.5rem; margin-bottom: 1.5rem; flex-wrap: wrap; align-items: center; }
        .filters a { padding: 0.4rem 0.8rem; border: 1px solid var(--border); color: var(--grey); text-decoration: none; font-size: 0.8rem; font-weight: 600; letter-spacing: 1px; text-transform: uppercase; transition: all 0.15s; }
        .filters a:hover, .filters a.active { border-color: var(--red); color: var(--red); }
        .filters input[type=date] { background: var(--black); border: 1px solid var(--border); color: var(--white); padding: 0.4rem 0.8rem; font-family: 'Barlow', sans-serif; font-size: 0.9rem; }

        .action-btns { display: flex; gap: 0.5rem; flex-wrap: wrap; }
        .action-btns button { padding: 0.3rem 0.8rem; font-size: 0.8rem; cursor: pointer; font-family: 'Barlow Condensed', sans-serif; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; border: 1px solid; transition: all 0.15s; background: none; }
        .btn-confirma { border-color: #1e8449; color: #1e8449; }
        .btn-confirma:hover { background: #1e8449; color: #fff; }
        .btn-inlucru  { border-color: #1a6a9a; color: #1a6a9a; }
        .btn-inlucru:hover  { background: #1a6a9a; color: #fff; }
        .btn-final    { border-color: var(--grey); color: var(--grey); }
        .btn-final:hover    { background: var(--grey); color: #000; }
        .btn-respinge { border-color: var(--red); color: var(--red); }
        .btn-respinge:hover { background: var(--red); color: #fff; }

        .tabel-desktop { display: block; }
        .carduri-mobile { display: none; }

        .admin-card { background: var(--dark2); border: 1px solid var(--border); border-left: 4px solid var(--border); padding: 1.2rem; margin-bottom: 1rem; }
        .admin-card.status-asteptare { border-left-color: #f0a500; }
        .admin-card.status-confirmat { border-left-color: #2ecc71; }
        .admin-card.status-respins   { border-left-color: var(--red); }
        .admin-card.status-in_lucru  { border-left-color: #3498db; }
        .admin-card.status-finalizat { border-left-color: var(--grey); }

        .admin-card-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.8rem; gap: 0.5rem; }
        .admin-card-masina { font-family: 'Barlow Condensed', sans-serif; font-size: 1.15rem; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; }
        .admin-card-masina small { display: block; font-family: 'Barlow', sans-serif; font-size: 0.8rem; font-weight: 400; color: var(--grey); text-transform: none; letter-spacing: 0; }
        .admin-card-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem 1rem; margin-bottom: 0.8rem; }
        .admin-card-row { display: flex; flex-direction: column; gap: 0.1rem; }
        .admin-card-row .lbl { font-size: 0.68rem; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase; color: var(--grey); }
        .admin-card-row .val { color: var(--white); font-size: 0.88rem; }
        .admin-card-row .val small { color: var(--grey); font-size: 0.78rem; display: block; }
        .admin-card-descriere { font-size: 0.83rem; color: var(--grey); padding: 0.7rem 0; border-top: 1px solid var(--border); border-bottom: 1px solid var(--border); margin-bottom: 0.8rem; }
        .admin-card-actions { display: flex; gap: 0.5rem; }
        .admin-card-actions form { flex: 1; }
        .admin-card-actions button { width: 100%; padding: 0.55rem 0.5rem; font-size: 0.85rem; cursor: pointer; font-family: 'Barlow Condensed', sans-serif; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; border: 1px solid; transition: all 0.15s; background: none; }

        .modal { display:none; position:fixed; inset:0; background:rgba(0,0,0,0.85); z-index:999; align-items:center; justify-content:center; padding: 1rem; }
        .modal.open { display:flex; }
        .modal-box { background: var(--dark2); border: 1px solid var(--border); padding: 1.5rem; width: 100%; max-width: 420px; }
        .modal-box h3 { font-family:'Barlow Condensed',sans-serif; font-size:1.4rem; font-weight:800; text-transform:uppercase; margin-bottom:1rem; }

        @media (max-width: 750px) {
            .tabel-desktop { display: none; }
            .carduri-mobile { display: block; }
        }
    </style>
</head>
<body>

<?php require_once __DIR__ . '/../src/views/nav_admin.php'; ?>

<div class="container">
    <div class="page-title">Panou <span>Admin</span></div>
    <div class="page-subtitle">Gestionează programările servisului</div>

    <div class="stats-row">
        <div class="stat-card"><div class="num" style="color:#f0a500"><?= $stats['asteptare'] ?? 0 ?></div><div class="lbl">Așteptare</div></div>
        <div class="stat-card"><div class="num" style="color:#2ecc71"><?= $stats['confirmat'] ?? 0 ?></div><div class="lbl">Confirmate</div></div>
        <div class="stat-card"><div class="num" style="color:#3498db"><?= $stats['in_lucru'] ?? 0 ?></div><div class="lbl">În lucru</div></div>
        <div class="stat-card"><div class="num" style="color:var(--grey)"><?= $stats['finalizat'] ?? 0 ?></div><div class="lbl">Finalizate</div></div>
        <div class="stat-card"><div class="num" style="color:var(--red)"><?= $stats['respins'] ?? 0 ?></div><div class="lbl">Respinse</div></div>
    </div>

    <div class="filters">
        <?php
        $statuses = ['toate' => 'Toate', 'asteptare' => 'Așteptare', 'confirmat' => 'Confirmate', 'in_lucru' => 'În lucru', 'finalizat' => 'Finalizate', 'respins' => 'Respinse'];
        foreach ($statuses as $k => $v):
            $active = ($filter_status === $k) ? ' active' : '';
            $url = '/admin/index.php?status=' . $k . ($filter_data ? '&data=' . $filter_data : '');
        ?>
            <a href="<?= $url ?>" class="<?= $active ?>"><?= $v ?></a>
        <?php endforeach; ?>
        <form method="GET" style="display:flex;gap:0.5rem;align-items:center;flex-wrap:wrap;">
            <input type="hidden" name="status" value="<?= htmlspecialchars($filter_status) ?>">
            <input type="date" name="data" value="<?= htmlspecialchars($filter_data) ?>">
            <button type="submit" class="btn btn-outline" style="padding:0.4rem 0.8rem;font-size:0.8rem;">Filtrează</button>
            <?php if ($filter_data): ?>
                <a href="/admin/index.php?status=<?= $filter_status ?>" class="btn btn-outline" style="padding:0.4rem 0.8rem;font-size:0.8rem;">Reset</a>
            <?php endif; ?>
        </form>
    </div>

    <?php if (empty($rezervari)): ?>
        <div class="card" style="text-align:center;padding:2rem;color:var(--grey);">Nicio programare găsită.</div>
    <?php else: ?>

    <div class="tabel-desktop">
        <div class="card" style="padding:0;overflow-x:auto;">
            <table>
                <thead>
                    <tr>
                        <th>Data</th><th>Ora</th><th>Client</th><th>Telefon</th>
                        <th>Mașina</th><th>Serviciu</th><th>Durată</th><th>Descriere</th>
                        <th>Status</th><th>Acțiuni</th>
                    </tr>
                </thead>
                <tbody>
                <?php foreach ($rezervari as $r): ?>
                    <tr>
                        <td><?= date('d.m.Y', strtotime($r['data'])) ?></td>
                        <td><?= substr($r['ora_start'], 0, 5) ?></td>
                        <td><strong><?= htmlspecialchars($r['client_nume']) ?></strong><br><small style="color:var(--grey)"><?= htmlspecialchars($r['client_email']) ?></small></td>
                        <td><?= htmlspecialchars($r['client_telefon']) ?></td>
                        <td><strong style="font-family:'Barlow Condensed',sans-serif;letter-spacing:1px;"><?= htmlspecialchars($r['nr_inmatriculare'] ?? '-') ?></strong><br><small style="color:var(--grey)"><?= htmlspecialchars(($r['producator'] ?? '') . ' ' . ($r['model'] ?? '')) ?></small></td>
                        <td><?= serviciu_label($r['serviciu_tip']) ?></td>
                        <td><?= $r['durata'] ?>h</td>
                        <td style="max-width:160px;font-size:0.85rem;color:var(--grey);"><?= htmlspecialchars($r['descriere'] ? substr($r['descriere'], 0, 80) : '-') ?></td>
                        <td><span class="badge badge-<?= $r['status'] ?>"><?= $status_label[$r['status']] ?></span></td>
                        <td>
                            <div class="action-btns">
                                <?php if ($r['status'] === 'asteptare'): ?>
                                    <form method="POST"><input type="hidden" name="rez_id" value="<?= $r['id'] ?>"><input type="hidden" name="actiune" value="confirma"><button type="submit" class="btn-confirma">Confirmă</button></form>
                                    <button class="btn-respinge" onclick="openRespinge(<?= $r['id'] ?>)">Respinge</button>
                                <?php endif; ?>
                                <?php if ($r['status'] === 'confirmat'): ?>
                                    <form method="POST"><input type="hidden" name="rez_id" value="<?= $r['id'] ?>"><input type="hidden" name="actiune" value="in_lucru"><button type="submit" class="btn-inlucru">În lucru</button></form>
                                <?php endif; ?>
                                <?php if ($r['status'] === 'in_lucru'): ?>
                                    <form method="POST"><input type="hidden" name="rez_id" value="<?= $r['id'] ?>"><input type="hidden" name="actiune" value="finalizeaza"><button type="submit" class="btn-final">Finalizat</button></form>
                                <?php endif; ?>
                                <a href="/admin/deviz.php?rezervare_id=<?= $r['id'] ?>" class="btn-inlucru" style="padding:0.3rem 0.8rem;font-size:0.8rem;font-family:'Barlow Condensed',sans-serif;font-weight:700;letter-spacing:1px;text-transform:uppercase;text-decoration:none;border:1px solid #1a6a9a;color:#1a6a9a;transition:all 0.15s;">Deviz</a>
                            </div>
                        </td>
                    </tr>
                <?php endforeach; ?>
                </tbody>
            </table>
        </div>
    </div>

    <div class="carduri-mobile">
        <?php foreach ($rezervari as $r): ?>
        <div class="admin-card status-<?= $r['status'] ?>">
            <div class="admin-card-header">
                <div class="admin-card-masina">
                    <?= htmlspecialchars($r['nr_inmatriculare'] ?? '-') ?>
                    <small><?= htmlspecialchars(($r['producator'] ?? '') . ' ' . ($r['model'] ?? '')) ?></small>
                </div>
                <span class="badge badge-<?= $r['status'] ?>"><?= $status_label[$r['status']] ?></span>
            </div>
            <div class="admin-card-grid">
                <div class="admin-card-row"><span class="lbl">Data</span><span class="val"><?= date('d.m.Y', strtotime($r['data'])) ?></span></div>
                <div class="admin-card-row"><span class="lbl">Ora</span><span class="val"><?= substr($r['ora_start'], 0, 5) ?> (<?= $r['durata'] ?>h)</span></div>
                <div class="admin-card-row"><span class="lbl">Client</span><span class="val"><?= htmlspecialchars($r['client_nume']) ?><small><?= htmlspecialchars($r['client_telefon']) ?></small></span></div>
                <div class="admin-card-row"><span class="lbl">Serviciu</span><span class="val"><?= serviciu_label($r['serviciu_tip']) ?></span></div>
            </div>
            <?php if ($r['descriere']): ?>
            <div class="admin-card-descriere"><?= htmlspecialchars(substr($r['descriere'], 0, 120)) ?></div>
            <?php endif; ?>
            <div class="admin-card-actions">
                <?php if ($r['status'] === 'asteptare'): ?>
                    <form method="POST"><input type="hidden" name="rez_id" value="<?= $r['id'] ?>"><input type="hidden" name="actiune" value="confirma"><button type="submit" class="btn-confirma">Confirmă</button></form>
                    <button class="btn-respinge" onclick="openRespinge(<?= $r['id'] ?>)" style="flex:1;padding:0.55rem;">Respinge</button>
                <?php endif; ?>
                <?php if ($r['status'] === 'confirmat'): ?>
                    <form method="POST" style="flex:1;"><input type="hidden" name="rez_id" value="<?= $r['id'] ?>"><input type="hidden" name="actiune" value="in_lucru"><button type="submit" class="btn-inlucru" style="width:100%;">În lucru</button></form>
                <?php endif; ?>
                <?php if ($r['status'] === 'in_lucru'): ?>
                    <form method="POST" style="flex:1;"><input type="hidden" name="rez_id" value="<?= $r['id'] ?>"><input type="hidden" name="actiune" value="finalizeaza"><button type="submit" class="btn-final" style="width:100%;">Finalizat</button></form>
                <?php endif; ?>
            </div>
            <div style="margin-top:0.6rem;">
                <a href="/admin/deviz.php?rezervare_id=<?= $r['id'] ?>" style="display:block;text-align:center;padding:0.5rem;border:1px solid var(--border);color:var(--grey);font-size:0.8rem;font-family:'Barlow Condensed',sans-serif;font-weight:700;letter-spacing:1px;text-transform:uppercase;text-decoration:none;transition:all 0.15s;" onmouseover="this.style.borderColor='var(--red)';this.style.color='var(--red)'" onmouseout="this.style.borderColor='var(--border)';this.style.color='var(--grey)'">🔧 Deviz</a>
            </div>
        </div>
        <?php endforeach; ?>
    </div>

    <?php endif; ?>
</div>

<div class="modal" id="modal-respinge">
    <div class="modal-box">
        <h3>Respinge programarea</h3>
        <form method="POST" id="form-respinge">
            <input type="hidden" name="rez_id" id="respinge-id">
            <input type="hidden" name="actiune" value="respinge">
            <div class="form-group">
                <label>Motiv (opțional)</label>
                <input type="text" name="motiv" placeholder="ex: Nu avem disponibilitate în acea zi">
            </div>
            <div style="display:flex;gap:1rem;margin-top:1rem;">
                <button type="submit" class="btn btn-danger">Respinge</button>
                <button type="button" class="btn btn-outline" onclick="closeRespinge()">Anulează</button>
            </div>
        </form>
    </div>
</div>

<footer>© <?= date('Y') ?> APG Garage. Toate drepturile rezervate.</footer>

<script>
function openRespinge(id) {
    document.getElementById('respinge-id').value = id;
    document.getElementById('modal-respinge').classList.add('open');
}
function closeRespinge() {
    document.getElementById('modal-respinge').classList.remove('open');
}
document.getElementById('modal-respinge').addEventListener('click', function(e) {
    if (e.target === this) closeRespinge();
});
</script>
</body>
</html>
