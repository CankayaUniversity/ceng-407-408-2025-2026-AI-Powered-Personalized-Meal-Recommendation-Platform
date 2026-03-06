-- V1: Initial Schema (Squashed Migrations V1-V6)
-- This file represents the consolidated state of the database schema.

-- 1. Users Table
CREATE TABLE users (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    diet_type VARCHAR(50),
    dietary_goal VARCHAR(50),
    weight DOUBLE PRECISION,
    height DOUBLE PRECISION,
    age INTEGER,
    gender VARCHAR(20),
    activity_level VARCHAR(50),
    daily_calorie_target INTEGER,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL
);

-- 2. User Allergies
CREATE TABLE user_allergies (
    user_id BIGINT NOT NULL,
    allergy VARCHAR(255) NOT NULL,
    PRIMARY KEY (user_id, allergy),
    CONSTRAINT fk_user_allergies_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);

-- 3. Recipes Table
CREATE TABLE recipes (
    id BIGSERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    instructions TEXT,
    preparation_time_minutes INTEGER,
    difficulty VARCHAR(20),
    servings INTEGER
);

-- 4. Ingredients Table (Global Dictionary)
CREATE TABLE ingredients (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    category VARCHAR(50)
);

-- 5. Ingredient Nutrition Table (1-to-1 with Ingredient)
CREATE TABLE ingredient_nutrition (
    ingredient_id BIGINT PRIMARY KEY,
    calories_per100g DOUBLE PRECISION NOT NULL,
    protein_per100g DOUBLE PRECISION NOT NULL,
    carbs_per100g DOUBLE PRECISION NOT NULL,
    fat_per100g DOUBLE PRECISION NOT NULL,
    CONSTRAINT fk_nutrition_ingredient FOREIGN KEY (ingredient_id) REFERENCES ingredients (id) ON DELETE CASCADE
);

-- 6. Recipe Ingredients Table (Many-to-Many Join Table)
CREATE TABLE recipe_ingredients (
    id BIGSERIAL PRIMARY KEY,
    recipe_id BIGINT NOT NULL,
    ingredient_id BIGINT NOT NULL,
    grams DOUBLE PRECISION NOT NULL,
    CONSTRAINT fk_ri_recipe FOREIGN KEY (recipe_id) REFERENCES recipes (id) ON DELETE CASCADE,
    CONSTRAINT fk_ri_ingredient FOREIGN KEY (ingredient_id) REFERENCES ingredients (id) ON DELETE RESTRICT,
    CONSTRAINT unique_recipe_ingredient UNIQUE (recipe_id, ingredient_id)
);

-- 7. Inventories Table
CREATE TABLE inventories (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    ingredient_id BIGINT NOT NULL,
    quantity DOUBLE PRECISION,
    unit VARCHAR(50),
    CONSTRAINT fk_inventory_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT fk_inventories_ingredient FOREIGN KEY (ingredient_id) REFERENCES ingredients (id) ON DELETE CASCADE,
    CONSTRAINT unique_inventory UNIQUE (user_id, ingredient_id)
);

-- 8. Daily Consumptions Table
CREATE TABLE daily_consumptions (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    recipe_id BIGINT,
    food_name VARCHAR(255) NOT NULL,
    estimated_calories INTEGER,
    meal_type VARCHAR(50),
    portion_size VARCHAR(50),
    consumed_at TIMESTAMP NOT NULL,
    is_custom_entry BOOLEAN,
    CONSTRAINT fk_consumption_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT fk_daily_consumptions_recipe FOREIGN KEY (recipe_id) REFERENCES recipes (id) ON DELETE SET NULL
);

-- 9. Recipe Ratings Table
CREATE TABLE recipe_ratings (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    recipe_id BIGINT NOT NULL,
    rating INTEGER NOT NULL,
    comment TEXT,
    created_at TIMESTAMP NOT NULL,
    CONSTRAINT fk_rating_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT fk_rating_recipe FOREIGN KEY (recipe_id) REFERENCES recipes (id) ON DELETE CASCADE,
    CONSTRAINT unique_user_recipe_rating UNIQUE (user_id, recipe_id)
);

-- 10. Indexes for Performance
CREATE INDEX idx_recipes_title ON recipes (title);
CREATE INDEX idx_ingredients_name ON ingredients (name);
CREATE INDEX idx_ri_recipe_id ON recipe_ingredients (recipe_id);
CREATE INDEX idx_ri_ingredient_id ON recipe_ingredients (ingredient_id);
CREATE INDEX idx_inventories_user_id ON inventories (user_id);
CREATE INDEX idx_daily_consumptions_user_id ON daily_consumptions (user_id);
CREATE INDEX idx_recipe_ratings_recipe_id ON recipe_ratings (recipe_id);
