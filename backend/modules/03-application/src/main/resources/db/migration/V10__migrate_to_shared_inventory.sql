-- 1. User ve InventoryGroup arasındaki Many-to-Many ilişkisi için ara tablo
CREATE TABLE user_inventory_groups (
    user_id VARCHAR(255) NOT NULL,
    inventory_group_id BIGINT NOT NULL,
    PRIMARY KEY (user_id, inventory_group_id),
    CONSTRAINT fk_user_inventory_groups_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_user_inventory_groups_group FOREIGN KEY (inventory_group_id) REFERENCES inventory_groups(id) ON DELETE CASCADE
);

-- 2. Mevcut InventoryGroup (Lokasyon) verilerini ara tabloya taşı (her grubun eski sahibini yeni yapıya ekle)
INSERT INTO user_inventory_groups (user_id, inventory_group_id)
SELECT user_id, id FROM inventory_groups;

-- 3. InventoryGroup tablosundan user_id sütununu kaldır (artık Many-to-Many ile bağlı)
ALTER TABLE inventory_groups DROP COLUMN user_id;

-- 4. Inventory tablosundan user_id sütununu kaldır (artık sadece InventoryGroup üzerinden kullanıcıya bağlı)
ALTER TABLE inventories DROP COLUMN user_id;

-- 5. Inventory tablosundaki unique kısıtlamayı güncelle (user_id kaldırıldı)
ALTER TABLE inventories DROP CONSTRAINT IF EXISTS unique_inventory;
ALTER TABLE inventories ADD CONSTRAINT unique_inventory UNIQUE (inventory_group_id, ingredient_id);
