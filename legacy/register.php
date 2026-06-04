<?php
require_once __DIR__ . '/src/config/config.php';
require_once __DIR__ . '/src/config/db.php';
require_once __DIR__ . '/src/helpers/Auth.php';
require_once __DIR__ . '/src/helpers/Mailer.php';

if (Auth::isLoggedIn()) {
    header('Location: /dashboard.php');
    exit;
}

$error   = '';
$success = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $nume     = trim($_POST['nume'] ?? '');
    $email    = trim($_POST['email'] ?? '');
    $telefon  = trim($_POST['telefon'] ?? '');
    $parola   = $_POST['parola'] ?? '';
    $parola2  = $_POST['parola2'] ?? '';

    if (!$nume || !$email || !$parola) {
        $error = 'Completează toate câmpurile obligatorii.';
    } elseif (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        $error = 'Adresa de email nu este validă.';
    } elseif (strlen($parola) < 6) {
        $error = 'Parola trebuie să aibă minim 6 caractere.';
    } elseif ($parola !== $parola2) {
        $error = 'Parolele nu coincid.';
    } else {
        $stmt = $pdo->prepare('SELECT id FROM users WHERE email = ?');
        $stmt->execute([$email]);
        if ($stmt->fetch()) {
            $error = 'Există deja un cont cu această adresă de email.';
        } else {
            $hash = password_hash($parola, PASSWORD_DEFAULT);
            $stmt = $pdo->prepare('INSERT INTO users (nume, email, parola, telefon) VALUES (?, ?, ?, ?)');
            $stmt->execute([$nume, $email, $hash, $telefon]);
            notificareContNou($nume, $email, $telefon);
            $success = 'Cont creat cu succes! Te poți autentifica acum.';
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
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
    <meta name="apple-mobile-web-app-title" content="APG Garage">
    <link rel="manifest" href="/manifest.json">
    <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png">
    <script>if("serviceWorker"in navigator){window.addEventListener("load",function(){navigator.serviceWorker.register("/sw.js");});}</script>
    <title>Creare cont — APG Garage</title>
    <link rel="stylesheet" href="/css/style.css">
    <style>
        .auth-wrap {
            min-height: calc(100vh - 64px);
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 2rem;
        }
        .auth-box { width: 100%; max-width: 460px; }
        .auth-box .page-title { font-size: 1.8rem; margin-bottom: 0.2rem; }
        .auth-box .page-subtitle { margin-bottom: 1.5rem; }
        .auth-footer { margin-top: 1.2rem; text-align: center; color: var(--grey); font-size: 0.9rem; }
        .auth-footer a { color: var(--red); text-decoration: none; }
    </style>
</head>
<body>
<nav>
    <a href="/" class="nav-logo">APG <span>Garage</span></a>
    <div class="nav-links">
        <a href="/login.php">Autentificare</a>
    </div>
</nav>

<div class="auth-wrap">
    <div class="auth-box">
        <div class="page-title">Creare <span>cont</span></div>
        <div class="page-subtitle">Înregistrează-te pentru a face o programare</div>

        <?php if ($error): ?>
            <div class="alert alert-error"><?= htmlspecialchars($error) ?></div>
        <?php endif; ?>
        <?php if ($success): ?>
            <div class="alert alert-success"><?= htmlspecialchars($success) ?> <a href="/login.php" style="color:inherit;font-weight:600;">Mergi la login →</a></div>
        <?php endif; ?>

        <div class="card">
            <form method="POST">
                <div class="form-group">
                    <label>Nume complet *</label>
                    <input type="text" name="nume" value="<?= htmlspecialchars($_POST['nume'] ?? '') ?>" required>
                </div>
                <div class="form-group">
                    <label>Email *</label>
                    <input type="email" name="email" value="<?= htmlspecialchars($_POST['email'] ?? '') ?>" required>
                </div>
                <div class="form-group">
                    <label>Telefon</label>
                    <input type="tel" name="telefon" value="<?= htmlspecialchars($_POST['telefon'] ?? '') ?>">
                </div>
                <div class="form-group">
                    <label>Parolă * (minim 6 caractere)</label>
                    <input type="password" name="parola" required>
                </div>
                <div class="form-group">
                    <label>Confirmă parola *</label>
                    <input type="password" name="parola2" required>
                </div>
                <button type="submit" class="btn btn-primary" style="width:100%;margin-top:0.5rem;">Creează cont</button>
            </form>
        </div>

        <div class="auth-footer">
            Ai deja cont? <a href="/login.php">Autentifică-te</a>
        </div>
    </div>
</div>

<footer>© <?= date('Y') ?> APG Garage. Toate drepturile rezervate.</footer>
</body>
</html>
