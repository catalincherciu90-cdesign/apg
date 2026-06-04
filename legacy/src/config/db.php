<?php
define('DB_HOST', 'localhost');
define('DB_NAME', 'servis_auto');
define('DB_USER', 'apg-garage');
define('DB_PASS', 'DQVYGhGSV3Fz2J0');

try {
    $pdo = new PDO(
        'mysql:host=' . DB_HOST . ';dbname=' . DB_NAME . ';charset=utf8mb4',
        DB_USER,
        DB_PASS,
        [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES   => false
        ]
    );
} catch (PDOException $e) {
    die('Eroare conexiune DB: ' . $e->getMessage());
}
