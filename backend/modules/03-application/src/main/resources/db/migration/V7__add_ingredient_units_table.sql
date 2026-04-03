CREATE TABLE IF NOT EXISTS ingredient_units (
    id BIGSERIAL PRIMARY KEY,
    ingredient_id BIGINT NOT NULL,
    unit_name VARCHAR(255) NOT NULL,
    grams DOUBLE PRECISION NOT NULL,
    CONSTRAINT fk_ingredient_units_ingredient FOREIGN KEY (ingredient_id) REFERENCES ingredients(id) ON DELETE CASCADE,
    CONSTRAINT uk_ingredient_unit UNIQUE (ingredient_id, unit_name)
);

-- Örnek Veriler (Domates, Yumurta, Ekmek gibi temel malzemeler için birimler)
-- Not: ID'lerin mevcut veritabanına göre ayarlanması gerekebilir, 
-- ancak genel mantık için temel malzemelere (ID: 1, 2, 3 varsayımıyla) ekleme yapalım.

-- Domates için örnek (ID varsayımıyla, gerçekte isimle eşleşme daha güvenli olabilir ama SQL'de ID kullanılır)
-- INSERT INTO ingredient_units (ingredient_id, unit_name, grams) 
-- SELECT id, 'adet', 150.0 FROM ingredients WHERE title LIKE '%Domates%' OR title LIKE '%Tomato%' LIMIT 1;
-- INSERT INTO ingredient_units (ingredient_id, unit_name, grams) 
-- SELECT id, 'tane', 150.0 FROM ingredients WHERE title LIKE '%Domates%' OR title LIKE '%Tomato%' LIMIT 1;

-- Yumurta için örnek
-- INSERT INTO ingredient_units (ingredient_id, unit_name, grams) 
-- SELECT id, 'adet', 50.0 FROM ingredients WHERE title LIKE '%Yumurta%' OR title LIKE '%Egg%' LIMIT 1;

-- Ekmek için örnek
-- INSERT INTO ingredient_units (ingredient_id, unit_name, grams) 
-- SELECT id, 'dilim', 30.0 FROM ingredients WHERE title LIKE '%Ekmek%' OR title LIKE '%Bread%' LIMIT 1;
-- INSERT INTO ingredient_units (ingredient_id, unit_name, grams) 
-- SELECT id, 'slice', 30.0 FROM ingredients WHERE title LIKE '%Ekmek%' OR title LIKE '%Bread%' LIMIT 1;
