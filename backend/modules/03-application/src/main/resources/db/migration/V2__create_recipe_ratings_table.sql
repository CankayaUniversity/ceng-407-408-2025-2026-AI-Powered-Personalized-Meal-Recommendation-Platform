CREATE TABLE recipe_ratings (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    recipe_id BIGINT NOT NULL,
    rating INTEGER NOT NULL,
    comment TEXT,
    created_at TIMESTAMP NOT NULL,
    CONSTRAINT fk_rating_user FOREIGN KEY (user_id) REFERENCES users (id),
    CONSTRAINT fk_rating_recipe FOREIGN KEY (recipe_id) REFERENCES recipes (id),
    CONSTRAINT unique_user_recipe_rating UNIQUE (user_id, recipe_id)
);
