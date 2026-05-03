-- Add parent_id to recipes table for versioning/updates
ALTER TABLE recipes ADD COLUMN parent_id BIGINT;
CREATE INDEX idx_recipes_parent_id ON recipes(parent_id);
