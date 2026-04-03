-- Ingredients tablosuna physical_state kolonunu ekle
ALTER TABLE ingredients ADD COLUMN physical_state VARCHAR(50);

-- Varsayılan olarak tüm malzemeleri SOLID (KATI) yap
UPDATE ingredients SET physical_state = 'SOLID';

-- Kategori bazlı SIVI (LIQUID) olanları güncelle
UPDATE ingredients 
SET physical_state = 'LIQUID' 
WHERE category IN ('OIL', 'SAUCE', 'BEVERAGE');

-- Süt ürünlerinden yoğunluğu olanları veya sütün kendisini (gelecekte daha hassas yapılabilir)
-- Şimdilik kategori bazlı devam edelim.

-- Kolonu NULL olamaz yap (varsayılan değer ile)
ALTER TABLE ingredients ALTER COLUMN physical_state SET NOT NULL;
ALTER TABLE ingredients ALTER COLUMN physical_state SET DEFAULT 'SOLID';
