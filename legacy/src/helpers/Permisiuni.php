<?php
// src/helpers/Permisiuni.php

class Permisiuni {

    const TOATE = ['programari', 'devize', 'servicii', 'tractari', 'dezmembrari'];

    const LABELS = [
        'programari'   => 'Programări & Devize',
        'devize'       => 'Devize',
        'servicii'     => 'Servicii',
        'tractari'     => 'Tractări',
        'dezmembrari'  => 'Dezmembrări & Cereri piese',
    ];

    public static function get($user_id, $pdo) {
        $stmt = $pdo->prepare('SELECT permisiuni FROM users WHERE id = ?');
        $stmt->execute([$user_id]);
        $row = $stmt->fetch();
        if (!$row || !$row['permisiuni']) return [];
        $decoded = json_decode($row['permisiuni'], true);
        return is_array($decoded) ? $decoded : [];
    }

    public static function are($sectiune) {
        if (!isset($_SESSION['user_id']) || ($_SESSION['user_rol'] ?? '') !== 'angajat') return false;
        $permisiuni = $_SESSION['permisiuni'] ?? [];
        return in_array($sectiune, $permisiuni);
    }

    public static function requireAccess($sectiune) {
        if (!self::are($sectiune)) {
            header('Location: /admin/index.php?eroare=acces');
            exit;
        }
    }

    public static function loadInSession($user_id, $pdo) {
        $stmt = $pdo->prepare('SELECT permisiuni FROM users WHERE id = ?');
        $stmt->execute([$user_id]);
        $row = $stmt->fetch();
        $decoded = $row && $row['permisiuni'] ? json_decode($row['permisiuni'], true) : [];
        $_SESSION['permisiuni'] = is_array($decoded) ? $decoded : [];
    }

    public static function isSuperAdmin() {
        $permisiuni = $_SESSION['permisiuni'] ?? [];
        return count(array_intersect(self::TOATE, $permisiuni)) === count(self::TOATE);
    }
}
