-- Flyway Migration: V3__refactor_ingredients_entity.sql
-- Purpose: Normalize ingredients, add nutrition model, and create many-to-many join table.

-- 1) First, clean up existing ingredients table to make it a global dictionary
-- In V1, it was tied to recipes. We drop it and recreate it.
DROP TABLE IF EXISTS ingredients CASCADE;

CREATE TABLE ingredients (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    category VARCHAR(50)
);

-- 2) Create ingredient_nutrition table (1-to-1 with Ingredient)
CREATE TABLE IF NOT EXISTS ingredient_nutrition (
    id BIGSERIAL PRIMARY KEY,
    ingredient_id BIGINT NOT NULL UNIQUE,
    calories DOUBLE PRECISION NOT NULL,
    protein DOUBLE PRECISION NOT NULL,
    carbs DOUBLE PRECISION NOT NULL,
    fat DOUBLE PRECISION NOT NULL,
    CONSTRAINT fk_nutrition_ingredient FOREIGN KEY (ingredient_id) REFERENCES ingredients (id) ON DELETE CASCADE
);

-- 3) Create recipe_ingredients table (Many-to-Many Join Table)
-- We ensure this table exists and has the correct structure.
DROP TABLE IF EXISTS recipe_ingredients CASCADE;

CREATE TABLE recipe_ingredients (
    id BIGSERIAL PRIMARY KEY,
    recipe_id BIGINT NOT NULL,
    ingredient_id BIGINT NOT NULL,
    grams DOUBLE PRECISION NOT NULL,
    CONSTRAINT fk_ri_recipe FOREIGN KEY (recipe_id) REFERENCES recipes (id) ON DELETE CASCADE,
    CONSTRAINT fk_ri_ingredient FOREIGN KEY (ingredient_id) REFERENCES ingredients (id) ON DELETE RESTRICT
);

-- 4) Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_ingredients_name ON ingredients (name);
CREATE INDEX IF NOT EXISTS idx_ri_recipe_id ON recipe_ingredients (recipe_id);
CREATE INDEX IF NOT EXISTS idx_ri_ingredient_id ON recipe_ingredients (ingredient_id);

-- 5) Update recipes table
ALTER TABLE recipes DROP COLUMN IF EXISTS calories;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='recipes' AND column_name='servings') THEN
        ALTER TABLE recipes ADD COLUMN servings INTEGER;
    END IF;
END$$;
