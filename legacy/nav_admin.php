<?php
// src/views/nav_admin.php
$current = basename($_SERVER['PHP_SELF']);
?>
<nav id="admin-nav">
    <a href="/admin/index.php" class="nav-logo">APG <span>Garage</span> <span style="font-size:0.7rem;color:#555;letter-spacing:1px;font-weight:400;">ADMIN</span></a>

    <!-- Desktop nav -->
    <div class="nav-links" id="admin-nav-links">

        <!-- Programari -->
        <div class="nav-dropdown">
            <button class="nav-dropdown-btn <?= in_array($current, ['index.php','blocare.php']) ? 'active' : '' ?>">
                Programări <span class="arrow">▾</span>
            </button>
            <div class="nav-dropdown-menu">
                <a href="/admin/index.php" class="<?= $current==='index.php'?'active':'' ?>">Toate programările</a>
                <a href="/admin/blocare.php" class="<?= $current==='blocare.php'?'active':'' ?>">Zile blocate</a>
            </div>
        </div>

        <!-- Servicii -->
        <div class="nav-dropdown">
            <button class="nav-dropdown-btn <?= in_array($current, ['servicii.php','deviz.php']) ? 'active' : '' ?>">
                Servicii <span class="arrow">▾</span>
            </button>
            <div class="nav-dropdown-menu">
                <a href="/admin/servicii.php" class="<?= $current==='servicii.php'?'active':'' ?>">Gestionare servicii</a>
                <a href="/admin/index.php" class="<?= $current==='deviz.php'?'active':'' ?>">Devize</a>
            </div>
        </div>

        <!-- Tractari -->
        <div class="nav-dropdown">
            <button class="nav-dropdown-btn <?= in_array($current, ['tractari.php']) ? 'active' : '' ?>">
                Tractări <span class="arrow">▾</span>
            </button>
            <div class="nav-dropdown-menu">
                <a href="/admin/tractari.php" class="<?= $current==='tractari.php'?'active':'' ?>">Cereri tractare</a>
            </div>
        </div>

        <!-- Dezmembrari -->
        <div class="nav-dropdown">
            <button class="nav-dropdown-btn <?= in_array($current, ['dezmembrari.php','cereri_piese.php']) ? 'active' : '' ?>">
                Dezmembrări <span class="arrow">▾</span>
            </button>
            <div class="nav-dropdown-menu">
                <a href="/admin/dezmembrari.php" class="<?= $current==='dezmembrari.php'?'active':'' ?>">Mașini dezmembrate</a>
                <a href="/admin/cereri_piese.php" class="<?= $current==='cereri_piese.php'?'active':'' ?>">Cereri piese</a>
            </div>
        </div>

        <a href="/" style="color:var(--grey);font-size:0.85rem;letter-spacing:1px;text-transform:uppercase;">Site</a>
        <a href="/logout.php" style="color:var(--grey);font-size:0.85rem;letter-spacing:1px;text-transform:uppercase;">Ieșire</a>
    </div>

    <!-- Hamburger -->
    <button class="hamburger" id="admin-hamburger" aria-label="Meniu">
        <span></span><span></span><span></span>
    </button>
</nav>

<!-- Mobile menu admin -->
<div class="mobile-menu" id="admin-mobile-menu">
    <div style="font-size:0.68rem;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:var(--red);padding:0.5rem 0;border-bottom:1px solid var(--border);margin-bottom:0.3rem;">Programări</div>
    <a href="/admin/index.php">Toate programările</a>
    <a href="/admin/blocare.php">Zile blocate</a>

    <div style="font-size:0.68rem;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:var(--red);padding:0.8rem 0 0.5rem;border-bottom:1px solid var(--border);margin-top:0.5rem;margin-bottom:0.3rem;">Servicii</div>
    <a href="/admin/servicii.php">Gestionare servicii</a>

    <div style="font-size:0.68rem;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:var(--red);padding:0.8rem 0 0.5rem;border-bottom:1px solid var(--border);margin-top:0.5rem;margin-bottom:0.3rem;">Tractări</div>
    <a href="/admin/tractari.php">Cereri tractare</a>

    <div style="font-size:0.68rem;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:var(--red);padding:0.8rem 0 0.5rem;border-bottom:1px solid var(--border);margin-top:0.5rem;margin-bottom:0.3rem;">Dezmembrări</div>
    <a href="/admin/dezmembrari.php">Mașini dezmembrate</a>
    <a href="/admin/cereri_piese.php">Cereri piese</a>

    <div style="margin-top:1rem;border-top:1px solid var(--border);padding-top:0.8rem;">
        <a href="/">Site public</a>
        <a href="/logout.php">Ieșire</a>
    </div>
</div>

<style>
/* ===== ADMIN NAV ===== */
#admin-nav {
    background: var(--black);
    border-bottom: 2px solid var(--red);
    padding: 0 1.5rem;
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: 64px;
    position: sticky;
    top: 0;
    z-index: 200;
}

/* Dropdown container */
.nav-dropdown {
    position: relative;
}

.nav-dropdown-btn {
    background: none;
    border: none;
    color: var(--grey-light);
    font-family: 'Barlow', sans-serif;
    font-size: 0.88rem;
    font-weight: 500;
    letter-spacing: 1px;
    text-transform: uppercase;
    cursor: pointer;
    padding: 0.3rem 0;
    display: flex;
    align-items: center;
    gap: 0.3rem;
    transition: color 0.2s;
    white-space: nowrap;
}
.nav-dropdown-btn:hover,
.nav-dropdown-btn.active { color: var(--red); }

.nav-dropdown-btn .arrow {
    font-size: 0.65rem;
    transition: transform 0.2s;
}
.nav-dropdown:hover .nav-dropdown-btn .arrow,
.nav-dropdown.open .nav-dropdown-btn .arrow { transform: rotate(180deg); }

/* Dropdown menu */
.nav-dropdown-menu {
    display: none;
    position: absolute;
    top: calc(100% + 10px);
    left: 50%;
    transform: translateX(-50%);
    background: var(--black);
    border: 1px solid var(--border);
    border-top: 2px solid var(--red);
    min-width: 200px;
    z-index: 300;
    box-shadow: 0 8px 24px rgba(0,0,0,0.5);
}
.nav-dropdown:hover .nav-dropdown-menu,
.nav-dropdown.open .nav-dropdown-menu { display: block; }

.nav-dropdown-menu a {
    display: block;
    padding: 0.75rem 1.2rem;
    color: var(--grey-light);
    text-decoration: none;
    font-size: 0.85rem;
    font-weight: 500;
    letter-spacing: 0.5px;
    border-bottom: 1px solid var(--border);
    transition: all 0.15s;
    white-space: nowrap;
}
.nav-dropdown-menu a:last-child { border-bottom: none; }
.nav-dropdown-menu a:hover,
.nav-dropdown-menu a.active {
    background: rgba(192,57,43,0.1);
    color: var(--red);
    padding-left: 1.5rem;
}
</style>

<script>
(function() {
    // Hamburger admin
    const btn  = document.getElementById('admin-hamburger');
    const menu = document.getElementById('admin-mobile-menu');
    if (!btn || !menu) return;

    btn.addEventListener('click', function() {
        const isOpen = menu.classList.toggle('open');
        btn.classList.toggle('open', isOpen);
        document.body.style.overflow = isOpen ? 'hidden' : '';
    });

    menu.querySelectorAll('a').forEach(function(link) {
        link.addEventListener('click', function() {
            menu.classList.remove('open');
            btn.classList.remove('open');
            document.body.style.overflow = '';
        });
    });

    window.addEventListener('resize', function() {
        if (window.innerWidth > 768) {
            menu.classList.remove('open');
            btn.classList.remove('open');
            document.body.style.overflow = '';
        }
    });
})();
</script>
