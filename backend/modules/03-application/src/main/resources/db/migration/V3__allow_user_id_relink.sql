ALTER TABLE user_allergies
    DROP CONSTRAINT IF EXISTS fk_user_allergies_user,
    ADD CONSTRAINT fk_user_allergies_user
        FOREIGN KEY (user_id) REFERENCES users (id)
        ON DELETE CASCADE
        ON UPDATE CASCADE;

ALTER TABLE inventories
    DROP CONSTRAINT IF EXISTS fk_inventory_user,
    ADD CONSTRAINT fk_inventory_user
        FOREIGN KEY (user_id) REFERENCES users (id)
        ON DELETE CASCADE
        ON UPDATE CASCADE;

ALTER TABLE daily_consumptions
    DROP CONSTRAINT IF EXISTS fk_consumption_user,
    ADD CONSTRAINT fk_consumption_user
        FOREIGN KEY (user_id) REFERENCES users (id)
        ON DELETE CASCADE
        ON UPDATE CASCADE;

ALTER TABLE recipe_ratings
    DROP CONSTRAINT IF EXISTS fk_rating_user,
    ADD CONSTRAINT fk_rating_user
        FOREIGN KEY (user_id) REFERENCES users (id)
        ON DELETE CASCADE
        ON UPDATE CASCADE;
