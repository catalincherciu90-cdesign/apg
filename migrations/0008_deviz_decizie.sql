-- Decizia clientului asupra devizului (aprobat / respins)
ALTER TABLE devize ADD COLUMN decizie TEXT;
ALTER TABLE devize ADD COLUMN decizie_data TEXT;
