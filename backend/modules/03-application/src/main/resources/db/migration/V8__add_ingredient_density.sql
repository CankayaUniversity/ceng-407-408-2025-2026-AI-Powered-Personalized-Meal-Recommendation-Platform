-- Malzemelere yoğunluk (density) alanı ekleniyor.
-- Varsayılan değer 1.0 (su yoğunluğu) olarak belirlendi.
-- Bu alan ml-gram dönüşümlerinde doğru hesaplama yapılması için kullanılır.
ALTER TABLE ingredients ADD COLUMN density DOUBLE PRECISION DEFAULT 1.0 NOT NULL;

-- Örnek veriler: Süt ve benzeri sıvıların yoğunluklarını güncelleyebiliriz (isteğe bağlı)
-- UPDATE ingredients SET density = 1.03 WHERE name ILIKE '%milk%' OR name ILIKE '%süt%';
-- UPDATE ingredients SET density = 0.92 WHERE name ILIKE '%oil%' OR name ILIKE '%yağ%';
