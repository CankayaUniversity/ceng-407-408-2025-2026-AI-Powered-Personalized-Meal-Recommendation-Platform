CREATE TABLE inventory_groups (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    icon VARCHAR(50),
    user_id VARCHAR(50) NOT NULL,
    CONSTRAINT fk_inventory_groups_user
        FOREIGN KEY (user_id) REFERENCES users (id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,
    CONSTRAINT unique_inventory_group_name UNIQUE (user_id, name)
);

CREATE INDEX idx_inventory_groups_user_id ON inventory_groups (user_id);

INSERT INTO inventory_groups (name, icon, user_id)
SELECT 'Home', 'home', u.id
FROM users u;

ALTER TABLE inventories
    ADD COLUMN inventory_group_id BIGINT;

UPDATE inventories i
SET inventory_group_id = g.id
FROM inventory_groups g
WHERE g.user_id = i.user_id
  AND g.name = 'Home';

ALTER TABLE inventories
    ALTER COLUMN inventory_group_id SET NOT NULL;

ALTER TABLE inventories
    ADD CONSTRAINT fk_inventories_group
        FOREIGN KEY (inventory_group_id) REFERENCES inventory_groups (id)
        ON DELETE CASCADE;

ALTER TABLE inventories
    DROP CONSTRAINT IF EXISTS unique_inventory,
    ADD CONSTRAINT unique_inventory UNIQUE (user_id, inventory_group_id, ingredient_id);

CREATE INDEX idx_inventories_group_id ON inventories (inventory_group_id);
