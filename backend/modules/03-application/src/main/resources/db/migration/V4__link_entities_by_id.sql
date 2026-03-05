-- Envanter tablosunda ingredient_name kolonunu kaldırıp ingredient_id (Foreign Key) ekleme
ALTER TABLE inventories ADD COLUMN ingredient_id BIGINT;

-- Mevcut verileri korumak zor (name -> id eşleşmesi lazım), seed servisi her şeyi baştan yaratacağı için şimdilik temiz geçiş yapıyoruz.
-- Eğer üretim ortamı olsaydı burada bir UPDATE scripti yazılırdı.
DELETE FROM inventories; 

ALTER TABLE inventories ALTER COLUMN ingredient_id SET NOT NULL;
ALTER TABLE inventories ADD CONSTRAINT fk_inventories_ingredient FOREIGN KEY (ingredient_id) REFERENCES ingredients (id);
ALTER TABLE inventories DROP COLUMN ingredient_name;

-- Günlük Tüketim tablosuna recipe_id ekleme
ALTER TABLE daily_consumptions ADD COLUMN recipe_id BIGINT;
ALTER TABLE daily_consumptions ADD CONSTRAINT fk_daily_consumptions_recipe FOREIGN KEY (recipe_id) REFERENCES recipes (id);
