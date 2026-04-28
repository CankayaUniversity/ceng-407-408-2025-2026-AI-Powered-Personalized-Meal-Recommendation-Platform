-- V14 Migration Güncellemesi
ALTER TABLE recipe_ingredients
    ADD COLUMN IF NOT EXISTS amount DOUBLE PRECISION DEFAULT 0,
    ADD COLUMN IF NOT EXISTS unit VARCHAR(50) DEFAULT 'gram',
    ADD COLUMN IF NOT EXISTS grams DOUBLE PRECISION DEFAULT 0; -- Başlangıç değeri 0

-- Mevcut satırlar için null güvenliği (opsiyonel)
UPDATE recipe_ingredients SET grams = 0 WHERE grams IS NULL;

-- Kısıtlamalar
ALTER TABLE recipe_ingredients
    ALTER COLUMN amount SET NOT NULL,
ALTER COLUMN unit SET NOT NULL,
ALTER COLUMN grams SET NOT NULL;