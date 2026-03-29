CREATE TABLE user_disliked_ingredients (
    user_id VARCHAR(50) NOT NULL,
    ingredient_name VARCHAR(255) NOT NULL,
    PRIMARY KEY (user_id, ingredient_name),
    CONSTRAINT fk_user_disliked_ingredients_user
        FOREIGN KEY (user_id) REFERENCES users (id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
);
