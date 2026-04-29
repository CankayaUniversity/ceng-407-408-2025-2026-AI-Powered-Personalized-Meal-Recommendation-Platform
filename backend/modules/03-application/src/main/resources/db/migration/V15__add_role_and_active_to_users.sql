-- Users tablosuna role ve active alanlarının eklenmesi
ALTER TABLE users ADD COLUMN role VARCHAR(20) NOT NULL DEFAULT 'USER';
ALTER TABLE users ADD COLUMN active BOOLEAN NOT NULL DEFAULT TRUE;

-- Mevcut kayıtların güncellenmesi (zaten DEFAULT ile eklendi ama netlik için)
UPDATE users SET role = 'USER' WHERE role IS NULL;
UPDATE users SET active = TRUE WHERE active IS NULL;
