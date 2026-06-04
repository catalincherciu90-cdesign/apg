<?php
require_once __DIR__ . '/src/config/config.php';
require_once __DIR__ . '/src/config/db.php';
require_once __DIR__ . '/src/helpers/Auth.php';
require_once __DIR__ . '/src/helpers/Permisiuni.php';

if (Auth::isLoggedIn()) {
    header('Location: /dashboard.php');
    exit;
}

$error = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $email  = trim($_POST['email'] ?? '');
    $parola = $_POST['parola'] ?? '';

    if (!$email || !$parola) {
        $error = 'Completează email-ul și parola.';
    } else {
        $stmt = $pdo->prepare('SELECT * FROM users WHERE email = ?');
        $stmt->execute([$email]);
        $user = $stmt->fetch();

        if ($user && password_verify($parola, $user['parola'])) {
            Auth::login($user);

            // Incarca permisiunile in sesiune
            if ($user['rol'] === 'angajat') {
                Permisiuni::loadInSession($user['id'], $pdo);
                header('Location: /admin/index.php');
            } else {
                header('Location: /dashboard.php');
            }
            exit;
        } else {
            $error = 'Email sau parolă incorectă.';
        }
    }
}
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
    <title>Autentificare — APG Garage</title>
    <link rel="stylesheet" href="/css/style.css">
    <style>
        .auth-wrap { min-height:calc(100vh - 64px); display:flex; align-items:center; justify-content:center; padding:2rem; }
        .auth-box { width:100%; max-width:420px; }
        .auth-box .page-title { font-size:1.8rem; margin-bottom:0.2rem; }
        .auth-box .page-subtitle { margin-bottom:1.5rem; }
        .auth-footer { margin-top:1.2rem; text-align:center; color:var(--grey); font-size:0.9rem; }
        .auth-footer a { color:var(--red); text-decoration:none; }
    </style>
</head>
<body>
<?php require_once __DIR__ . '/src/views/nav.php'; ?>

<div class="auth-wrap">
    <div class="auth-box">
        <div class="page-title">Bun <span>venit</span></div>
        <div class="page-subtitle">Autentifică-te în contul tău</div>

        <?php if ($error): ?>
            <div class="alert alert-error"><?= htmlspecialchars($error) ?></div>
        <?php endif; ?>

        <?php if (isset($_GET['eroare']) && $_GET['eroare'] === 'acces'): ?>
            <div class="alert alert-error">Nu ai acces la această secțiune.</div>
        <?php endif; ?>

        <div class="card">
            <form method="POST">
                <div class="form-group">
                    <label>Email</label>
                    <input type="email" name="email" value="<?= htmlspecialchars($_POST['email'] ?? '') ?>" required autofocus>
                </div>
                <div class="form-group">
                    <label>Parolă</label>
                    <input type="password" name="parola" required>
                </div>
                <button type="submit" class="btn btn-primary" style="width:100%;margin-top:0.5rem;">Autentificare</button>
            </form>
        </div>

        <div class="auth-footer">
            Nu ai cont? <a href="/register.php">Înregistrează-te</a>
        </div>
    </div>
</div>

<footer>© <?= date('Y') ?> APG Garage. Toate drepturile rezervate.</footer>
</body>
</html>
