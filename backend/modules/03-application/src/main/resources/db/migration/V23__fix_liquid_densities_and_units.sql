-- Sıvı malzemeler için yoğunluk (density) ve fiziksel durum (physical_state) düzeltmeleri
-- Ayrıca süt için tercih edilen birimi L (Litre) olarak ayarlıyoruz

-- Süt için yoğunluk 1.03 civarıdır, fiziksel durum LIQUID olmalı
UPDATE ingredients SET density = 1.03, physical_state = 'LIQUID', preferred_unit = 'L' WHERE name ILIKE '%süt%' AND name NOT ILIKE '%sütlü%';

-- Zeytinyağı ve diğer yağlar için yoğunluk ~0.91
UPDATE ingredients SET density = 0.91, physical_state = 'LIQUID' WHERE name ILIKE '%zeytinyağı%' OR name ILIKE '%sıvı yağ%';

-- Su için yoğunluk 1.0
UPDATE ingredients SET density = 1.0, physical_state = 'LIQUID' WHERE name ILIKE 'su';

-- Bal, Pekmez gibi yarı-katı/yoğun sıvılar
UPDATE ingredients SET density = 1.4, physical_state = 'SEMI_SOLID' WHERE name ILIKE '%bal%' OR name ILIKE '%pekmez%';

-- Yoğurt
UPDATE ingredients SET density = 1.05, physical_state = 'SEMI_SOLID' WHERE name ILIKE '%yoğurt%';
