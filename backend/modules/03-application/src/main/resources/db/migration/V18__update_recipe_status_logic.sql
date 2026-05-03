-- RecipeStatus'a DRAFT statüsünün eklenmesi ve statü mantığının güncellenmesi
-- Mevcut statüler: DRAFT, PENDING, APPROVED, REJECTED
-- DRAFT = 0, PENDING = 1, APPROVED = 2, REJECTED = 3 (Eğer ordinal tutuluyorsa, ama biz String tutuyoruz)

-- Statü kısıtlamasını kaldırıp/güncelleyebiliriz ancak String olduğu için doğrudan INSERT edilebilir.
-- Eğer statü kontrolü varsa veritabanı seviyesinde, onu güncellemek gerekir.
-- Mevcut tarifler APPROVED olarak kalmaya devam edecek.

-- Bu bir placeholder migration'dır, String enum kullanıldığı için schema değişikliği gerektirmez.
-- Ancak ileride statü bazlı index eklemek gerekebilir:
CREATE INDEX idx_recipes_status_creator ON recipes(status, created_by);
