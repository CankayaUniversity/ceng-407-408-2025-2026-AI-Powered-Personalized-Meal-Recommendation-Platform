CREATE TABLE recipe_favorites (
    id BIGSERIAL PRIMARY KEY,
    user_id VARCHAR(50) NOT NULL,
    recipe_id BIGINT NOT NULL,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_favorite_recipe FOREIGN KEY (recipe_id) REFERENCES recipes(id),
    CONSTRAINT uk_user_recipe_favorite UNIQUE (user_id, recipe_id)
);

CREATE INDEX idx_recipe_favorites_user_id ON recipe_favorites(user_id);
CREATE INDEX idx_recipe_favorites_recipe_id ON recipe_favorites(recipe_id);
