CREATE TABLE IF NOT EXISTS recommendation_menus (
    id BIGSERIAL PRIMARY KEY,
    recommendation_id BIGINT NOT NULL,
    rank INTEGER NOT NULL,
    title VARCHAR(255),
    insight TEXT,
    total_kcal DOUBLE PRECISION,
    total_protein DOUBLE PRECISION,
    total_carbs DOUBLE PRECISION,
    total_fat DOUBLE PRECISION,
    total_preparation_time INTEGER,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_recommendation_menus_recommendation FOREIGN KEY (recommendation_id) REFERENCES recommendations(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS recommendation_menu_courses (
    id BIGSERIAL PRIMARY KEY,
    menu_id BIGINT NOT NULL,
    category VARCHAR(80) NOT NULL,
    recommended_recipe_id BIGINT NOT NULL,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_recommendation_menu_courses_menu FOREIGN KEY (menu_id) REFERENCES recommendation_menus(id) ON DELETE CASCADE,
    CONSTRAINT fk_recommendation_menu_courses_recommended_recipe FOREIGN KEY (recommended_recipe_id) REFERENCES recommended_recipes(id) ON DELETE CASCADE,
    CONSTRAINT uq_recommendation_menu_course_category UNIQUE (menu_id, category)
);

CREATE INDEX IF NOT EXISTS idx_recommendation_menus_recommendation_id ON recommendation_menus(recommendation_id);
CREATE INDEX IF NOT EXISTS idx_recommendation_menu_courses_menu_id ON recommendation_menu_courses(menu_id);
CREATE INDEX IF NOT EXISTS idx_recommendation_menu_courses_recommended_recipe_id ON recommendation_menu_courses(recommended_recipe_id);
