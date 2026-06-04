<?php
// cron_notificari.php
// Acest script se ruleaza zilnic printr-un cron job
// Cron job in Virtualmin: 0 9 * * * php /home/apg-garage.ro/public_html/cron_notificari.php

require_once __DIR__ . '/src/config/config.php';
require_once __DIR__ . '/src/config/db.php';
require_once __DIR__ . '/src/helpers/Mailer.php';

$azi = date('Y-m-d');
// Data la care se implineste 1 an de la revizie minus 30 zile
// adica trimitem notificarea cand mai sunt exact 30 de zile

$stmt = $pdo->query("
    SELECT m.*, u.email, u.nume
    FROM masini m
    JOIN users u ON u.id = m.user_id
    WHERE m.data_ultima_revizie IS NOT NULL
    AND m.notificare_trimisa = 0
    AND DATE_ADD(m.data_ultima_revizie, INTERVAL 335 DAY) <= '$azi'
    AND DATE_ADD(m.data_ultima_revizie, INTERVAL 365 DAY) > '$azi'
");

$masini = $stmt->fetchAll();

foreach ($masini as $m) {
    $data_revizie     = date('d.m.Y', strtotime($m['data_ultima_revizie']));
    $data_scadenta    = date('d.m.Y', strtotime($m['data_ultima_revizie'] . ' +1 year'));
    $zile_ramase      = (int)((strtotime($m['data_ultima_revizie'] . ' +1 year') - time()) / 86400);

    $continut = '
        <p>Stimate <strong>' . htmlspecialchars($m['nume']) . '</strong>,</p>
        <p>A trecut aproape un an de la ultima revizie a mașinii tale. Este momentul să programezi o nouă revizie!</p>
        <table class="info-table">
            <tr><td>Mașina</td><td>' . htmlspecialchars($m['nr_inmatriculare']) . ' — ' . htmlspecialchars($m['producator'] . ' ' . $m['model']) . '</td></tr>
            <tr><td>Ultima revizie</td><td>' . $data_revizie . '</td></tr>
            <tr><td>Revizie necesară până la</td><td><strong>' . $data_scadenta . '</strong></td></tr>
            <tr><td>Zile rămase</td><td>' . $zile_ramase . ' zile</td></tr>
        </table>
        <p>Programează-te acum pentru a-ți păstra mașina în stare optimă.</p>
        <a href="https://apg-garage.ro/rezervare.php" class="btn">Programează revizia</a>
    ';

    $rezultat = trimiteEmail(
        $m['email'],
        'Reminder revizie — ' . $m['nr_inmatriculare'] . ' — APG Garage',
        emailTemplate('Revizia mașinii tale se apropie!', $continut)
    );

    if ($rezultat) {
        $pdo->prepare('UPDATE masini SET notificare_trimisa = 1 WHERE id = ?')->execute([$m['id']]);
        echo date('Y-m-d H:i:s') . " — Notificare trimisa: {$m['email']} / {$m['nr_inmatriculare']}\n";
    } else {
        echo date('Y-m-d H:i:s') . " — EROARE trimitere: {$m['email']} / {$m['nr_inmatriculare']}\n";
    }
}

if (empty($masini)) {
    echo date('Y-m-d H:i:s') . " — Nicio notificare de trimis azi.\n";
}
