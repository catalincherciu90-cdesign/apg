<?php
require_once __DIR__ . '/src/config/config.php';
require_once __DIR__ . '/src/config/db.php';
require_once __DIR__ . '/src/helpers/Auth.php';
require_once __DIR__ . '/src/helpers/Mailer.php';

Auth::requireLogin();
if (Auth::isAngajat()) { header('Location: /admin/index.php'); exit; }

$error   = '';
$success = '';

function getSloturiDisponibile($pdo, $data, $durata) {
    $all_slots = ['09:00', '11:00', '13:00', '15:00'];
    if ($durata == 4) {
        $all_slots = ['09:00', '13:00'];
    }

    $stmt = $pdo->prepare('SELECT id FROM zile_blocate WHERE data = ?');
    $stmt->execute([$data]);
    if ($stmt->fetch()) return [];

    $zi = date('N', strtotime($data));
    if ($zi >= 6) return [];

    $stmt = $pdo->prepare("SELECT ora_start, durata FROM rezervari WHERE data = ? AND status IN ('asteptare','confirmat','in_lucru')");
    $stmt->execute([$data]);
    $ocupate = $stmt->fetchAll();

    $disponibile = [];
    foreach ($all_slots as $slot) {
        $slot_start = strtotime($data . ' ' . $slot);
        $slot_end   = $slot_start + ($durata * 3600);
        $liber = true;

        foreach ($ocupate as $rez) {
            $rez_start = strtotime($data . ' ' . $rez['ora_start']);
            $rez_end   = $rez_start + ($rez['durata'] * 3600);
            if ($slot_start < $rez_end && $slot_end > $rez_start) {
                $liber = false;
                break;
            }
        }

        if ($liber) $disponibile[] = $slot;
    }

    return $disponibile;
}

if (isset($_GET['ajax_slots'])) {
    header('Content-Type: application/json');
    $data   = $_GET['data'] ?? '';
    $durata = intval($_GET['durata'] ?? 2);
    if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $data)) {
        echo json_encode([]);
        exit;
    }
    echo json_encode(getSloturiDisponibile($pdo, $data, $durata));
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $serviciu       = $_POST['serviciu_tip'] ?? '';
    $descriere      = trim($_POST['descriere'] ?? '');
    $data           = $_POST['data'] ?? '';
    $ora            = $_POST['ora_start'] ?? '';
    $durata         = intval($_POST['durata'] ?? 2);
    $nr_inmatr      = strtoupper(trim($_POST['nr_inmatriculare'] ?? ''));
    $producator     = trim($_POST['producator'] ?? '');
    $model          = trim($_POST['model'] ?? '');

    if (!$serviciu || !$data || !$ora || !in_array($durata, [2, 4])) {
        $error = 'Completează toate câmpurile obligatorii.';
    } elseif (!$nr_inmatr || !$producator || !$model) {
        $error = 'Completează datele mașinii (număr înmatriculare, producător, model).';
    } elseif (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $data)) {
        $error = 'Dată invalidă.';
    } elseif ($data < date('Y-m-d')) {
        $error = 'Nu poți face rezervări în trecut.';
    } else {
        $disponibile = getSloturiDisponibile($pdo, $data, $durata);
        if (!in_array($ora, $disponibile)) {
            $error = 'Slotul selectat nu mai este disponibil. Te rugăm alege altul.';
        } else {
            $stmt = $pdo->prepare('INSERT INTO rezervari (user_id, nr_inmatriculare, producator, model, serviciu_tip, descriere, data, ora_start, durata) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
            $stmt->execute([$_SESSION['user_id'], $nr_inmatr, $producator, $model, $serviciu, $descriere, $data, $ora . ':00', $durata]);

            // Trimite notificare email
            $stmt_user = $pdo->prepare('SELECT email FROM users WHERE id = ?');
            $stmt_user->execute([$_SESSION['user_id']]);
            $user = $stmt_user->fetch();
            notificareProgramareNoua($_SESSION['user_nume'], $user['email'], $nr_inmatr, $producator, $model, $serviciu, $data, $ora . ':00', $durata);

            $success = true;
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
    <title>Programare nouă — APG Garage</title>
    <link rel="stylesheet" href="/css/style.css">
    <style>
        .rez-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 2rem;
            align-items: start;
        }
        @media (max-width: 700px) { .rez-grid { grid-template-columns: 1fr; gap: 0; } }

        .masina-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 0 1rem;
        }
        @media (max-width: 500px) { .masina-grid { grid-template-columns: 1fr; } }

        /* Calendar mai compact pe mobil */
        @media (max-width: 400px) {
            .cal-day { padding: 0.35rem 0; font-size: 0.8rem; }
            .cal-day-name { font-size: 0.62rem; }
            .cal-grid { gap: 3px; }
        }

        .calendar { user-select: none; }
        .cal-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 1rem;
        }
        .cal-header button {
            background: none;
            border: 1px solid var(--border);
            color: var(--white);
            padding: 0.3rem 0.8rem;
            cursor: pointer;
            font-size: 1rem;
            transition: border-color 0.2s;
        }
        .cal-header button:hover { border-color: var(--red); }
        .cal-month {
            font-family: 'Barlow Condensed', sans-serif;
            font-size: 1.2rem;
            font-weight: 700;
            letter-spacing: 1px;
            text-transform: uppercase;
        }
        .cal-grid {
            display: grid;
            grid-template-columns: repeat(7, 1fr);
            gap: 4px;
        }
        .cal-day-name {
            text-align: center;
            font-size: 0.7rem;
            font-weight: 600;
            letter-spacing: 1px;
            color: var(--grey);
            padding: 0.3rem 0;
            text-transform: uppercase;
        }
        .cal-day {
            text-align: center;
            padding: 0.5rem 0;
            font-size: 0.9rem;
            border: 1px solid transparent;
            cursor: default;
            transition: all 0.15s;
        }
        .cal-day.available { cursor: pointer; border-color: var(--border); color: var(--white); }
        .cal-day.available:hover { border-color: var(--red); color: var(--red); }
        .cal-day.selected { background: var(--red); color: var(--white) !important; border-color: var(--red); }
        .cal-day.past, .cal-day.weekend, .cal-day.blocked { color: #333; }
        .cal-day.empty { border: none; }

        .slots-wrap { margin-top: 1rem; }
        .slots-title { font-size: 0.75rem; font-weight: 600; letter-spacing: 1.5px; text-transform: uppercase; color: var(--grey); margin-bottom: 0.6rem; }
        .slots-grid { display: flex; flex-wrap: wrap; gap: 0.5rem; }
        .slot-btn {
            padding: 0.5rem 1.2rem;
            border: 1px solid var(--border);
            background: none;
            color: var(--white);
            font-family: 'Barlow Condensed', sans-serif;
            font-size: 1rem;
            font-weight: 600;
            letter-spacing: 1px;
            cursor: pointer;
            transition: all 0.15s;
        }
        .slot-btn:hover { border-color: var(--red); color: var(--red); }
        .slot-btn.active { background: var(--red); border-color: var(--red); color: var(--white); }

        .section-divider {
            font-size: 0.72rem;
            font-weight: 700;
            letter-spacing: 2px;
            text-transform: uppercase;
            color: var(--red);
            margin: 1.2rem 0 0.8rem;
            padding-bottom: 0.4rem;
            border-bottom: 1px solid var(--border);
        }

        .success-box { text-align: center; padding: 3rem 2rem; }
        .success-box .icon { font-size: 3rem; margin-bottom: 1rem; }
        .success-box h2 { font-family: 'Barlow Condensed', sans-serif; font-size: 1.8rem; font-weight: 800; text-transform: uppercase; margin-bottom: 0.5rem; }
        .success-box p { color: var(--grey); margin-bottom: 1.5rem; }
    </style>
</head>
<body>

<?php require_once __DIR__ . '/src/views/nav.php'; ?>

<div class="container">
    <div class="page-title">Programare <span>nouă</span></div>
    <div class="page-subtitle">Completează datele mașinii, alege serviciul și data dorită</div>

    <?php if ($success): ?>
        <div class="card success-box">
            <div class="icon">✓</div>
            <h2>Programare <span style="color:var(--red)">trimisă</span></h2>
            <p>Programarea ta a fost înregistrată și este în așteptarea confirmării din partea servisului.</p>
            <a href="/dashboard.php" class="btn btn-primary">Vezi programările mele</a>
        </div>
    <?php else: ?>

    <?php if ($error): ?>
        <div class="alert alert-error"><?= htmlspecialchars($error) ?></div>
    <?php endif; ?>

    <form method="POST" id="rez-form">
        <input type="hidden" name="data" id="input-data">
        <input type="hidden" name="ora_start" id="input-ora">

        <div class="rez-grid">
            <!-- Stanga: datele masinii + serviciu -->
            <div>
                <div class="card">
                    <div class="section-divider">Datele mașinii</div>

                    <div class="form-group">
                        <label>Număr înmatriculare *</label>
                        <input type="text" name="nr_inmatriculare"
                               value="<?= htmlspecialchars($_POST['nr_inmatriculare'] ?? '') ?>"
                               placeholder="ex: B 123 ABC"
                               style="text-transform:uppercase;"
                               required>
                    </div>

                    <div class="masina-grid">
                        <div class="form-group">
                            <label>Producător *</label>
                            <input type="text" name="producator"
                                   value="<?= htmlspecialchars($_POST['producator'] ?? '') ?>"
                                   placeholder="ex: Volkswagen"
                                   required>
                        </div>
                        <div class="form-group">
                            <label>Model *</label>
                            <input type="text" name="model"
                                   value="<?= htmlspecialchars($_POST['model'] ?? '') ?>"
                                   placeholder="ex: Golf 7"
                                   required>
                        </div>
                    </div>

                    <div class="section-divider">Serviciu</div>

                    <div class="form-group">
                        <label>Tip serviciu *</label>
                        <select name="serviciu_tip" id="serviciu_tip" required>
                            <option value="">Alege...</option>
                            <option value="revizie" <?= (($_POST['serviciu_tip'] ?? '') === 'revizie') ? 'selected' : '' ?>>Revizie</option>
                            <option value="reparatie" <?= (($_POST['serviciu_tip'] ?? '') === 'reparatie') ? 'selected' : '' ?>>Reparație mecanică</option>
                            <option value="verificare_rampa" <?= (($_POST['serviciu_tip'] ?? '') === 'verificare_rampa') ? 'selected' : '' ?>>Verificare rampă</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Durată estimată *</label>
                        <select name="durata" id="durata" required>
                            <option value="2" <?= (($_POST['durata'] ?? '2') === '2') ? 'selected' : '' ?>>2 ore</option>
                            <option value="4" <?= (($_POST['durata'] ?? '') === '4') ? 'selected' : '' ?>>4 ore (zi întreagă)</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Descriere problemă</label>
                        <textarea name="descriere" placeholder="Descrie pe scurt problema sau lucrarea dorită..."><?= htmlspecialchars($_POST['descriere'] ?? '') ?></textarea>
                    </div>
                </div>
            </div>

            <!-- Dreapta: calendar + sloturi -->
            <div>
                <div class="card">
                    <div class="section-divider" style="margin-top:0;">Alege data și ora</div>
                    <div class="calendar" id="calendar"></div>
                    <div class="slots-wrap" id="slots-wrap" style="display:none;">
                        <div class="slots-title">Ore disponibile</div>
                        <div class="slots-grid" id="slots-grid"></div>
                    </div>
                    <div id="slots-loading" style="display:none;color:var(--grey);font-size:0.9rem;margin-top:1rem;">Se încarcă...</div>
                    <div id="slots-empty" style="display:none;color:var(--red);font-size:0.9rem;margin-top:1rem;">Nu există ore disponibile în această zi.</div>
                </div>

                <div id="summary" style="display:none;" class="card">
                    <div style="font-size:0.8rem;color:var(--grey);letter-spacing:1px;text-transform:uppercase;margin-bottom:0.5rem;">Programare selectată</div>
                    <div id="summary-text" style="font-family:'Barlow Condensed',sans-serif;font-size:1.3rem;font-weight:700;"></div>
                </div>

                <button type="submit" class="btn btn-primary" id="btn-submit" style="width:100%;display:none;font-size:1.1rem;">Trimite programarea</button>
            </div>
        </div>
    </form>
    <?php endif; ?>
</div>

<footer>© <?= date('Y') ?> APG Garage. Toate drepturile rezervate.</footer>

<script>
(function() {
    const today = new Date();
    today.setHours(0,0,0,0);
    let currentYear  = today.getFullYear();
    let currentMonth = today.getMonth();
    let selectedDate = null;
    let selectedOra  = null;

    const months = ['Ianuarie','Februarie','Martie','Aprilie','Mai','Iunie','Iulie','August','Septembrie','Octombrie','Noiembrie','Decembrie'];
    const days   = ['Lu','Ma','Mi','Jo','Vi','Sâ','Du'];

    function renderCalendar() {
        const cal   = document.getElementById('calendar');
        const first = new Date(currentYear, currentMonth, 1);
        const last  = new Date(currentYear, currentMonth + 1, 0);
        let startDay = first.getDay();
        startDay = startDay === 0 ? 6 : startDay - 1;

        let html = `
            <div class="cal-header">
                <button type="button" id="prev-month">&#8592;</button>
                <div class="cal-month">${months[currentMonth]} ${currentYear}</div>
                <button type="button" id="next-month">&#8594;</button>
            </div>
            <div class="cal-grid">
        `;

        days.forEach(d => { html += `<div class="cal-day-name">${d}</div>`; });

        for (let i = 0; i < startDay; i++) {
            html += `<div class="cal-day empty"></div>`;
        }

        for (let d = 1; d <= last.getDate(); d++) {
            const date = new Date(currentYear, currentMonth, d);
            const dateStr = date.toISOString().split('T')[0];
            const isWeekend = date.getDay() === 0 || date.getDay() === 6;
            const isPast    = date < today;
            let cls = 'cal-day';

            if (isPast)         cls += ' past';
            else if (isWeekend) cls += ' weekend';
            else {
                cls += ' available';
                if (selectedDate === dateStr) cls += ' selected';
            }

            html += `<div class="${cls}" data-date="${dateStr}">${d}</div>`;
        }

        html += `</div>`;
        cal.innerHTML = html;

        document.getElementById('prev-month').addEventListener('click', () => {
            currentMonth--;
            if (currentMonth < 0) { currentMonth = 11; currentYear--; }
            renderCalendar();
        });
        document.getElementById('next-month').addEventListener('click', () => {
            currentMonth++;
            if (currentMonth > 11) { currentMonth = 0; currentYear++; }
            renderCalendar();
        });

        cal.querySelectorAll('.cal-day.available').forEach(el => {
            el.addEventListener('click', () => {
                selectedDate = el.dataset.date;
                selectedOra  = null;
                document.getElementById('input-data').value = selectedDate;
                document.getElementById('input-ora').value  = '';
                document.getElementById('summary').style.display = 'none';
                document.getElementById('btn-submit').style.display = 'none';
                renderCalendar();
                loadSlots();
            });
        });
    }

    function loadSlots() {
        if (!selectedDate) return;
        const durata = document.getElementById('durata').value;

        document.getElementById('slots-wrap').style.display    = 'none';
        document.getElementById('slots-loading').style.display = 'block';
        document.getElementById('slots-empty').style.display   = 'none';

        fetch(`/rezervare.php?ajax_slots=1&data=${selectedDate}&durata=${durata}`)
            .then(r => r.json())
            .then(slots => {
                document.getElementById('slots-loading').style.display = 'none';
                if (!slots.length) {
                    document.getElementById('slots-empty').style.display = 'block';
                    return;
                }
                document.getElementById('slots-wrap').style.display = 'block';
                const grid = document.getElementById('slots-grid');
                grid.innerHTML = '';
                slots.forEach(slot => {
                    const btn = document.createElement('button');
                    btn.type = 'button';
                    btn.className = 'slot-btn' + (selectedOra === slot ? ' active' : '');
                    btn.textContent = slot;
                    btn.addEventListener('click', () => {
                        selectedOra = slot;
                        document.getElementById('input-ora').value = slot;
                        grid.querySelectorAll('.slot-btn').forEach(b => b.classList.remove('active'));
                        btn.classList.add('active');
                        updateSummary();
                    });
                    grid.appendChild(btn);
                });
            });
    }

    function updateSummary() {
        if (!selectedDate || !selectedOra) return;
        const durata    = document.getElementById('durata').value;
        const serviciu  = document.getElementById('serviciu_tip').options[document.getElementById('serviciu_tip').selectedIndex]?.text || '';
        const nr        = document.querySelector('input[name="nr_inmatriculare"]').value.toUpperCase();
        const dateParts = selectedDate.split('-');
        const dateFormatted = `${dateParts[2]}.${dateParts[1]}.${dateParts[0]}`;
        document.getElementById('summary-text').textContent = `${nr} — ${serviciu} — ${dateFormatted} ora ${selectedOra} (${durata}h)`;
        document.getElementById('summary').style.display = 'block';
        document.getElementById('btn-submit').style.display = 'block';
    }

    document.getElementById('durata').addEventListener('change', () => {
        selectedOra = null;
        document.getElementById('input-ora').value = '';
        document.getElementById('summary').style.display = 'none';
        document.getElementById('btn-submit').style.display = 'none';
        if (selectedDate) loadSlots();
    });

    document.getElementById('rez-form').addEventListener('submit', function(e) {
        if (!selectedDate || !selectedOra) {
            e.preventDefault();
            alert('Alege o dată și o oră înainte de a trimite programarea.');
        }
    });

    renderCalendar();
})();
</script>
</body>
</html>
