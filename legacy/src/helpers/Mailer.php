<?php
// src/helpers/Mailer.php

require_once __DIR__ . '/../PHPMailer/PHPMailer.php';
require_once __DIR__ . '/../PHPMailer/SMTP.php';
require_once __DIR__ . '/../PHPMailer/Exception.php';

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\SMTP;
use PHPMailer\PHPMailer\Exception;

define('MAIL_GMAIL_USER', 'notificari.apggarage@gmail.com');
define('MAIL_GMAIL_PASS', 'sswqjoxlwgqvezrl');
define('MAIL_FROM_NAME',  'APG Garage');
define('MAIL_ADMIN',      'contact@apg-garage.ro');

function trimiteEmail($to, $subject, $body_html) {
    $mail = new PHPMailer(true);
    try {
        $mail->isSMTP();
        $mail->Host       = 'smtp.gmail.com';
        $mail->SMTPAuth   = true;
        $mail->Username   = MAIL_GMAIL_USER;
        $mail->Password   = MAIL_GMAIL_PASS;
        $mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
        $mail->Port       = 587;
        $mail->CharSet    = 'UTF-8';

        $mail->setFrom(MAIL_GMAIL_USER, MAIL_FROM_NAME);
        $mail->addAddress($to);
        $mail->isHTML(true);
        $mail->Subject = $subject;
        $mail->Body    = $body_html;

        $mail->send();
        return true;
    } catch (Exception $e) {
        error_log('Mailer error: ' . $mail->ErrorInfo);
        return false;
    }
}

function emailTemplate($titlu, $continut) {
    return '<!DOCTYPE html>
<html lang="ro">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<style>
  body { margin:0; padding:0; background:#111; font-family:Arial,sans-serif; }
  .wrap { max-width:580px; margin:0 auto; padding:30px 20px; }
  .header { background:#0a0a0a; border-top:4px solid #c0392b; padding:20px 30px; }
  .header h1 { margin:0; font-size:22px; color:#f5f5f5; letter-spacing:2px; text-transform:uppercase; }
  .header h1 span { color:#c0392b; }
  .body { background:#1a1a1a; padding:30px; border:1px solid #2a2a2a; border-top:none; }
  .body h2 { color:#f5f5f5; font-size:18px; margin-top:0; }
  .body p { color:#cccccc; line-height:1.7; font-size:14px; }
  .info-table { width:100%; border-collapse:collapse; margin:16px 0; }
  .info-table td { padding:8px 12px; font-size:13px; border-bottom:1px solid #2a2a2a; }
  .info-table td:first-child { color:#888; width:40%; }
  .info-table td:last-child { color:#f5f5f5; font-weight:600; }
  .btn { display:inline-block; background:#c0392b; color:#ffffff; padding:12px 24px; text-decoration:none; font-weight:700; font-size:14px; letter-spacing:1px; text-transform:uppercase; margin-top:16px; }
  .footer { background:#0a0a0a; padding:16px 30px; text-align:center; border:1px solid #2a2a2a; border-top:none; }
  .footer p { color:#555; font-size:12px; margin:0; }
</style>
</head>
<body>
<div class="wrap">
  <div class="header"><h1>APG <span>Garage</span></h1></div>
  <div class="body">
    <h2>' . $titlu . '</h2>
    ' . $continut . '
  </div>
  <div class="footer"><p>&copy; ' . date('Y') . ' APG Garage &mdash; apg-garage.ro</p></div>
</div>
</body>
</html>';
}

function notificareContNou($client_nume, $client_email, $client_telefon) {
    $continut = '
        <p>Un client nou s-a înregistrat pe site.</p>
        <table class="info-table">
            <tr><td>Nume</td><td>' . htmlspecialchars($client_nume) . '</td></tr>
            <tr><td>Email</td><td>' . htmlspecialchars($client_email) . '</td></tr>
            <tr><td>Telefon</td><td>' . htmlspecialchars($client_telefon ?: '—') . '</td></tr>
        </table>
        <a href="https://apg-garage.ro/admin/index.php" class="btn">Vezi panoul admin</a>
    ';
    trimiteEmail(MAIL_ADMIN, 'Cont nou înregistrat — ' . $client_nume, emailTemplate('Cont nou înregistrat', $continut));

    $continut_client = '
        <p>Bun venit, <strong>' . htmlspecialchars($client_nume) . '</strong>!</p>
        <p>Contul tău pe APG Garage a fost creat cu succes. Te poți autentifica și face o programare oricând.</p>
        <a href="https://apg-garage.ro/login.php" class="btn">Mergi la cont</a>
    ';
    trimiteEmail($client_email, 'Bun venit la APG Garage!', emailTemplate('Contul tău a fost creat', $continut_client));
}

function notificareProgramareNoua($client_nume, $client_email, $nr_inmatr, $producator, $model, $serviciu, $data, $ora, $durata) {
    $servicii = ['revizie' => 'Revizie', 'reparatie' => 'Reparație mecanică', 'verificare_rampa' => 'Verificare rampă'];
    $serviciu_text = $servicii[$serviciu] ?? ucfirst($serviciu);
    $data_text = date('d.m.Y', strtotime($data));

    $continut = '
        <p>O nouă programare a fost înregistrată și așteaptă confirmare.</p>
        <table class="info-table">
            <tr><td>Client</td><td>' . htmlspecialchars($client_nume) . '</td></tr>
            <tr><td>Email</td><td>' . htmlspecialchars($client_email) . '</td></tr>
            <tr><td>Mașina</td><td>' . htmlspecialchars($nr_inmatr) . ' — ' . htmlspecialchars($producator . ' ' . $model) . '</td></tr>
            <tr><td>Serviciu</td><td>' . $serviciu_text . '</td></tr>
            <tr><td>Data</td><td>' . $data_text . ' ora ' . substr($ora, 0, 5) . '</td></tr>
            <tr><td>Durată</td><td>' . $durata . ' ore</td></tr>
        </table>
        <a href="https://apg-garage.ro/admin/index.php" class="btn">Confirmă programarea</a>
    ';
    trimiteEmail(MAIL_ADMIN, 'Programare nouă — ' . $client_nume . ' / ' . $nr_inmatr, emailTemplate('Programare nouă în așteptare', $continut));

    $continut_client = '
        <p>Programarea ta a fost înregistrată cu succes și este în așteptarea confirmării din partea servisului.</p>
        <table class="info-table">
            <tr><td>Mașina</td><td>' . htmlspecialchars($nr_inmatr) . ' — ' . htmlspecialchars($producator . ' ' . $model) . '</td></tr>
            <tr><td>Serviciu</td><td>' . $serviciu_text . '</td></tr>
            <tr><td>Data</td><td>' . $data_text . ' ora ' . substr($ora, 0, 5) . '</td></tr>
            <tr><td>Durată</td><td>' . $durata . ' ore</td></tr>
            <tr><td>Status</td><td>În așteptare</td></tr>
        </table>
        <p>Vei primi un email când programarea este confirmată.</p>
        <a href="https://apg-garage.ro/dashboard.php" class="btn">Vezi programările mele</a>
    ';
    trimiteEmail($client_email, 'Programare înregistrată — ' . $data_text, emailTemplate('Programarea ta a fost înregistrată', $continut_client));
}

function notificareDevizNou($client_nume, $client_email, $nr_inmatr, $rezervare_id, $total) {
    $continut_client = '
        <p>Servisul APG Garage a emis un deviz pentru mașina ta.</p>
        <table class="info-table">
            <tr><td>Mașina</td><td>' . htmlspecialchars($nr_inmatr) . '</td></tr>
            <tr><td>Total deviz</td><td><strong>' . number_format($total, 2) . ' lei</strong></td></tr>
        </table>
        <p>Intră în contul tău pentru a vedea detaliile complete ale devizului.</p>
        <a href="https://apg-garage.ro/deviz.php?rezervare_id=' . $rezervare_id . '" class="btn">Vezi devizul</a>
    ';
    trimiteEmail($client_email, 'Deviz nou disponibil — APG Garage', emailTemplate('Ai un deviz nou', $continut_client));
}
