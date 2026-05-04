-- Malzemeler için tercih edilen birim (preferred_unit) kolonu eklenmesi
ALTER TABLE ingredients ADD COLUMN preferred_unit VARCHAR(50);

-- Mevcut veriler için bazı akıllı eşleştirmeler (Örnek)
UPDATE ingredients SET preferred_unit = 'diş' WHERE name ILIKE '%sarımsak%';
UPDATE ingredients SET preferred_unit = 'adet' WHERE name ILIKE '%yumurta%';
UPDATE ingredients SET preferred_unit = 'adet' WHERE name ILIKE '%domates%';
UPDATE ingredients SET preferred_unit = 'dal' WHERE name ILIKE '%maydanoz%' OR name ILIKE '%dereotu%';
UPDATE ingredients SET preferred_unit = 'tutam' WHERE name ILIKE '%tuz%' OR name ILIKE '%karabiber%';
