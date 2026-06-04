-- Ruleaza acest script in phpMyAdmin dupa ce ai incarcat fisierele pe hosting
-- Creaza un cont de angajat pentru tine

INSERT INTO users (nume, email, parola, telefon, rol) VALUES (
    'Admin APG',
    'admin@apg-garage.ro',
    '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',  -- parola: password
    '0700000000',
    'angajat'
);

-- IMPORTANT: Dupa prima autentificare, schimba parola din baza de date
-- sau adauga o pagina de schimbare parola
-- Parola implicita este: password
