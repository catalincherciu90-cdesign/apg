-- Tracking verificare rampă pe mașini (similar reviziei)
ALTER TABLE masini ADD COLUMN data_ultima_rampa TEXT;
ALTER TABLE masini ADD COLUMN notif_rampa_trimisa INTEGER NOT NULL DEFAULT 0;
