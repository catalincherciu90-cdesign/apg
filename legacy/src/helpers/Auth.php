<?php
class Auth {
    public static function login($user) {
        $_SESSION['user_id']  = $user['id'];
        $_SESSION['user_rol'] = $user['rol'];
        $_SESSION['user_nume']= $user['nume'];
    }

    public static function logout() {
        session_destroy();
        header('Location: /login.php');
        exit;
    }

    public static function isLoggedIn() {
        return isset($_SESSION['user_id']);
    }

    public static function isAngajat() {
        return isset($_SESSION['user_rol']) && $_SESSION['user_rol'] === 'angajat';
    }

    public static function requireLogin() {
        if (!self::isLoggedIn()) {
            header('Location: /login.php');
            exit;
        }
    }

    public static function requireAngajat() {
        if (!self::isAngajat()) {
            header('Location: /dashboard.php');
            exit;
        }
    }
}
