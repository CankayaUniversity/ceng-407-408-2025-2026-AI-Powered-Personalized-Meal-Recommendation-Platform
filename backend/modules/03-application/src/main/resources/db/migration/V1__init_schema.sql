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

CREATE TABLE user_allergies (
    user_id BIGINT NOT NULL,
    allergy VARCHAR(255),
    CONSTRAINT fk_user_allergies_user FOREIGN KEY (user_id) REFERENCES users (id)
);

CREATE TABLE recipes (
    id BIGSERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    instructions TEXT,
    preparation_time_minutes INTEGER,
    difficulty VARCHAR(20),
    calories INTEGER
);

CREATE TABLE ingredients (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    amount DOUBLE PRECISION NOT NULL,
    unit VARCHAR(50),
    recipe_id BIGINT,
    CONSTRAINT fk_ingredients_recipe FOREIGN KEY (recipe_id) REFERENCES recipes (id)
);

CREATE TABLE inventories (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    ingredient_name VARCHAR(255) NOT NULL,
    quantity DOUBLE PRECISION,
    unit VARCHAR(50),
    CONSTRAINT fk_inventory_user FOREIGN KEY (user_id) REFERENCES users (id)
);

CREATE TABLE daily_consumptions (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    food_name VARCHAR(255) NOT NULL,
    estimated_calories INTEGER,
    meal_type VARCHAR(50),
    portion_size VARCHAR(50),
    consumed_at TIMESTAMP NOT NULL,
    is_custom_entry BOOLEAN,
    CONSTRAINT fk_consumption_user FOREIGN KEY (user_id) REFERENCES users (id)
);
