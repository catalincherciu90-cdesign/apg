-- Cont admin initial (superadmin cu toate permisiunile).
-- Parola implicita: "password" — SCHIMB-O dupa prima autentificare!
-- Hash bcrypt preluat din configuratia veche ($2y$ este compatibil cu verificarea).
INSERT OR IGNORE INTO users (nume, email, parola, telefon, rol, permisiuni) VALUES (
  'Admin APG',
  'admin@apg-garage.ro',
  '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
  '0700000000',
  'angajat',
  '["programari","devize","servicii","tractari","dezmembrari"]'
);

-- Comutatoare pagini (exista implicit ca active)
INSERT OR IGNORE INTO setari (cheie, valoare) VALUES
  ('tractari_activ', '1'),
  ('dezmembrari_activ', '1');
