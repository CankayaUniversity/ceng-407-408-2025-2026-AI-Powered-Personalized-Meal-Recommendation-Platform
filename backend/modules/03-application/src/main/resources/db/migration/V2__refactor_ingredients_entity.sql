-- Flyway Migration: V2__refactor_ingredients_entity.sql
-- Purpose: Introduce normalized ingredients table and migrate data from legacy recipe_ingredients if present.

-- 1) Create new ingredients table if it doesn't exist
CREATE TABLE IF NOT EXISTS ingredients (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    amount DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    unit VARCHAR(50),
    recipe_id BIGINT,
    CONSTRAINT fk_ingredients_recipe FOREIGN KEY (recipe_id) REFERENCES recipes (id)
);

-- 2) Optional indexes to improve performance
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE c.relname = 'idx_ingredients_recipe_id' AND n.nspname = 'public'
    ) THEN
        CREATE INDEX idx_ingredients_recipe_id ON ingredients (recipe_id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE c.relname = 'idx_ingredients_name' AND n.nspname = 'public'
    ) THEN
        CREATE INDEX idx_ingredients_name ON ingredients (name);
    END IF;
END$$;

-- 3) Migrate legacy data from recipe_ingredients (if table exists)
--    Assumptions: legacy table shape => recipe_ingredients(recipe_id BIGINT NOT NULL, ingredient VARCHAR(255))
--    Using EXECUTE to avoid static analysis errors (unresolved table) if table is missing.
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'recipe_ingredients'
    ) THEN
        EXECUTE 'INSERT INTO ingredients (name, amount, unit, recipe_id)
        SELECT ri.ingredient AS name,
               1.0 AS amount,
               NULL AS unit,
               ri.recipe_id
        FROM recipe_ingredients ri
        WHERE NOT EXISTS (
            SELECT 1 FROM ingredients i
            WHERE i.recipe_id = ri.recipe_id AND i.name = ri.ingredient
        )';

        -- Drop legacy table after successful migration
        EXECUTE 'DROP TABLE IF EXISTS recipe_ingredients';
    END IF;
END$$;
