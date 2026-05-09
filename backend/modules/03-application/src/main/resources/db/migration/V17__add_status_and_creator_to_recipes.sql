-- Recipes tablosuna statü ve oluşturan kullanıcı alanlarının eklenmesi
ALTER TABLE recipes ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'APPROVED' NOT NULL;
ALTER TABLE recipes ADD COLUMN IF NOT EXISTS created_by VARCHAR(50);

-- Mevcut tariflerin statüsünü APPROVED yapalım (zaten default değer ama garanti olsun)
UPDATE recipes SET status = 'APPROVED' WHERE status IS NULL;
