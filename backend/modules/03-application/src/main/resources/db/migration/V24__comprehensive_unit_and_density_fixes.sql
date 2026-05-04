-- Kapsamlı birim, yoğunluk ve tercih edilen birim düzeltmeleri
-- Python scriptindeki mantığa paralel olarak kritik malzemeleri güncelliyoruz

-- 1. Un ve Toz Grubu (Density: 0.6)
UPDATE ingredients SET density = 0.6, physical_state = 'SOLID', preferred_unit = 'g' 
WHERE name ILIKE '%un%' OR name ILIKE '%nişasta%' OR name ILIKE '%kakao%' OR name ILIKE '%pudra%';

-- 2. Şeker (Density: 0.85)
UPDATE ingredients SET density = 0.85, physical_state = 'SOLID', preferred_unit = 'g' 
WHERE (name ILIKE '%şeker%' OR name ILIKE '%sugar%') AND name NOT ILIKE '%pudra%';

-- 3. Tuz ve Baharatlar
UPDATE ingredients SET density = 1.2, physical_state = 'SOLID', preferred_unit = 'tutam' 
WHERE name ILIKE '%tuz%' OR name ILIKE '%salt%';

UPDATE ingredients SET density = 0.4, physical_state = 'SOLID', preferred_unit = 'çay kaşığı' 
WHERE category = 'SPICE' OR name ILIKE '%karabiber%' OR name ILIKE '%kimyon%' OR name ILIKE '%nane%' OR name ILIKE '%kekik%';

-- 4. Bakliyatlar (Density: 0.8)
UPDATE ingredients SET density = 0.8, physical_state = 'SOLID', preferred_unit = 'bardak' 
WHERE name ILIKE '%pirinç%' OR name ILIKE '%mercimek%' OR name ILIKE '%bulgur%' OR name ILIKE '%makarna%';

-- 5. Sıvılar (V23'te bazıları yapılmıştı, eksikleri tamamlıyoruz)
UPDATE ingredients SET density = 1.03, physical_state = 'LIQUID', preferred_unit = 'L' 
WHERE name ILIKE '%süt%' AND name NOT ILIKE '%sütlü%';

UPDATE ingredients SET density = 0.92, physical_state = 'LIQUID', preferred_unit = 'yemek kaşığı' 
WHERE name ILIKE '%yağ%' OR name ILIKE '%oil%';

UPDATE ingredients SET density = 1.4, physical_state = 'SEMI_SOLID', preferred_unit = 'yemek kaşığı' 
WHERE name ILIKE '%bal%' OR name ILIKE '%pekmez%' OR name ILIKE '%reçel%';

-- 6. Adet ile satılan sebzeler
UPDATE ingredients SET preferred_unit = 'adet' 
WHERE name ILIKE '%domates%' OR name ILIKE '%yumurta%' OR name ILIKE '%salatalık%' OR name ILIKE '%biber%' OR name ILIKE '%patates%';

-- 7. Yeşillikler
UPDATE ingredients SET preferred_unit = 'dal' 
WHERE name ILIKE '%maydanoz%' OR name ILIKE '%dereotu%' OR name ILIKE '%nane%' AND physical_state = 'SOLID';

-- 8. Sarımsak
UPDATE ingredients SET preferred_unit = 'diş' WHERE name ILIKE '%sarımsak%';
