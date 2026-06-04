<?php
// src/views/nav.php
?>
<nav>
    <a href="/" class="nav-logo">APG <span>Garage</span></a>

    <!-- Desktop links -->
    <div class="nav-links">
        <a href="/despre.php">Despre noi</a>
        <a href="/preturi.php">Prețuri</a>
        <a href="/tractari.php">Tractări</a>
        <a href="/dezmembrari.php">Dezmembrări</a>
        <a href="/contact.php">Contact</a>
        <?php if (isset($_SESSION['user_id'])): ?>
            <?php if (isset($_SESSION['user_rol']) && $_SESSION['user_rol'] === 'angajat'): ?>
                <a href="/admin/index.php">Admin</a>
                <a href="/logout.php">Ieșire</a>
            <?php else: ?>
                <a href="/dashboard.php">Programările mele</a>
                <a href="/masini.php">Mașinile mele</a>
                <a href="/rezervare.php" class="btn btn-primary" style="padding:0.4rem 1.2rem;">Programare</a>
                <a href="/logout.php">Ieșire</a>
            <?php endif; ?>
        <?php else: ?>
            <a href="/login.php">Autentificare</a>
            <a href="/register.php" class="btn btn-primary" style="padding:0.4rem 1.2rem;">Cont nou</a>
        <?php endif; ?>
    </div>

    <!-- Hamburger -->
    <button class="hamburger" id="hamburger" aria-label="Meniu" aria-expanded="false">
        <span></span>
        <span></span>
        <span></span>
    </button>
</nav>

<!-- Mobile menu -->
<div class="mobile-menu" id="mobile-menu" aria-hidden="true">
    <a href="/">Acasă</a>
    <a href="/despre.php">Despre noi</a>
    <a href="/preturi.php">Prețuri</a>
    <a href="/tractari.php">Tractări auto</a>
    <a href="/dezmembrari.php">Piese dezmembrări</a>
    <a href="/contact.php">Contact</a>
    <?php if (isset($_SESSION['user_id'])): ?>
        <?php if (isset($_SESSION['user_rol']) && $_SESSION['user_rol'] === 'angajat'): ?>
            <a href="/admin/index.php">Admin</a>
            <a href="/logout.php">Ieșire</a>
        <?php else: ?>
            <a href="/dashboard.php">Programările mele</a>
            <a href="/masini.php">Mașinile mele</a>
            <a href="/logout.php">Ieșire</a>
            <a href="/rezervare.php" class="btn-mobile">Fă o programare</a>
        <?php endif; ?>
    <?php else: ?>
        <a href="/login.php">Autentificare</a>
        <a href="/register.php" class="btn-mobile">Programează-te</a>
    <?php endif; ?>
</div>

<script>
(function() {
    const btn  = document.getElementById('hamburger');
    const menu = document.getElementById('mobile-menu');
    if (!btn || !menu) return;

    btn.addEventListener('click', function() {
        const isOpen = menu.classList.toggle('open');
        btn.classList.toggle('open', isOpen);
        btn.setAttribute('aria-expanded', isOpen);
        menu.setAttribute('aria-hidden', !isOpen);
        document.body.style.overflow = isOpen ? 'hidden' : '';
    });

    menu.querySelectorAll('a').forEach(function(link) {
        link.addEventListener('click', function() {
            menu.classList.remove('open');
            btn.classList.remove('open');
            btn.setAttribute('aria-expanded', false);
            menu.setAttribute('aria-hidden', true);
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
