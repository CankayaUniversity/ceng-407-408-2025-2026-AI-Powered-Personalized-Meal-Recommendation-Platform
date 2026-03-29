ALTER TABLE daily_consumptions
ADD COLUMN ingredient_id BIGINT,
ADD COLUMN inventory_group_id BIGINT,
ADD COLUMN portion_label VARCHAR(120),
ADD COLUMN portion_multiplier DOUBLE PRECISION DEFAULT 1.0,
ADD COLUMN portion_grams DOUBLE PRECISION;

ALTER TABLE daily_consumptions
ADD CONSTRAINT fk_daily_consumptions_ingredient
FOREIGN KEY (ingredient_id) REFERENCES ingredients (id) ON DELETE SET NULL;

ALTER TABLE daily_consumptions
ADD CONSTRAINT fk_daily_consumptions_inventory_group
FOREIGN KEY (inventory_group_id) REFERENCES inventory_groups (id) ON DELETE SET NULL;

CREATE INDEX idx_daily_consumptions_inventory_group_id ON daily_consumptions (inventory_group_id);
